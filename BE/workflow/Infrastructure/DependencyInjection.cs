using Caps.Common.Persistence;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Infrastructure.Ai;
using Caps.Workflow.Infrastructure.Clients;
using Caps.Workflow.Infrastructure.Integrations;
using Caps.Workflow.Infrastructure.Jobs;
using Caps.Workflow.Infrastructure.Persistence;
using Caps.Workflow.Infrastructure.Persistence.Repositories;
using Caps.Workflow.Infrastructure.Storage;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Workflow.Infrastructure;

/// <summary>Registers the workflow adapters, starting with its database.</summary>
public static class DependencyInjection
{
    /// <summary>The workflow database (shared unit of work, readiness check) behind the application ports.</summary>
    public static IServiceCollection AddWorkflowInfrastructure(
        this IServiceCollection services,
        string connectionString,
        IConfiguration configuration
    )
    {
        services.AddServiceDatabase<WorkflowDbContext>(
            connectionString,
            "Workflow",
            "workspace",
            "review"
        );

        // Repositories
        services.AddScoped<IReviewCaseRepository, ReviewCaseRepository>();
        services.AddScoped<ICaseMessageRepository, CaseMessageRepository>();
        services.AddScoped<ICaseReadMarkerRepository, CaseReadMarkerRepository>();
        services.AddScoped<IConversationRepository, ConversationRepository>();
        services.AddScoped<IChatMessageRepository, ChatMessageRepository>();
        services.AddScoped<IAiQuotaRepository, AiQuotaRepository>();
        services.AddScoped<IAiUsageRepository, AiUsageRepository>();
        services.AddScoped<
            Caps.Workflow.Application.Abstractions.IDocumentRepository,
            Caps.Workflow.Infrastructure.Persistence.DocumentRepository
        >();
        services.AddScoped<
            Caps.Workflow.Application.Abstractions.Documents.IDocumentRepository,
            Caps.Workflow.Infrastructure.Persistence.Repositories.DocumentRepository
        >();
        services.AddScoped<IDocumentVersionRepository, DocumentVersionRepository>();
        services.AddScoped<IInputSnapshotRepository, InputSnapshotRepository>();
        services.AddScoped<IInfoRequestRepository, InfoRequestRepository>();
        services.AddScoped<IReviewDisputeRepository, ReviewDisputeRepository>();
        services.AddScoped<IReviewAttachmentRepository, ReviewAttachmentRepository>();
        services.AddSingleton<IObjectStorage, S3ObjectStorage>();
        services.AddScoped<ITemplateRepository, TemplateRepository>();

        // RAG query HTTP client
        var ragServiceBaseUrl = configuration["Services:BaseUrl"] ?? "http://rag-query:5200";
        services.AddHttpClient<IRagQueryClient, RagQueryClient>(client =>
        {
            client.BaseAddress = new Uri(ragServiceBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(60);
        });

        // Ollama draft generation HTTP client
        var ollamaBaseUrl = configuration["Ai:OllamaUrl"] ?? "http://localhost:11434";
        services.AddHttpClient<IOllamaDraftService, OllamaDraftService>(client =>
        {
            client.BaseAddress = new Uri(ollamaBaseUrl);
            client.Timeout = TimeSpan.FromMinutes(3);
        });

        return services;
    }

    /// <summary>
    /// HTTP clients for the expert and billing /internal endpoints. Expert:Url and Billing:Url are required;
    /// the keys (Expert:InternalKey, Billing:InternalKey) come from user-secrets or .env, and a missing key makes
    /// those calls answer 503.
    /// </summary>
    public static IServiceCollection AddWorkflowServiceLinks(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services.AddHttpClient<ExpertServiceClient>(http => Link(http, config, "Expert"));
        services.AddScoped<IExpertOfferings>(sp => sp.GetRequiredService<ExpertServiceClient>());
        services.AddScoped<IExpertSlots>(sp => sp.GetRequiredService<ExpertServiceClient>());
        services.AddScoped<IExpertRatings>(sp => sp.GetRequiredService<ExpertServiceClient>());
        services.AddHttpClient<BillingServiceClient>(http => Link(http, config, "Billing"));
        services.AddScoped<IEscrows>(sp => sp.GetRequiredService<BillingServiceClient>());
        // The expiry job refunds and settles through these links
        services.AddHostedService<ReviewCaseExpiryJob>();
        return services;
    }

    // No automatic retry: the user's retry is safe because every internal call is idempotent
    private static void Link(HttpClient http, IConfiguration config, string service)
    {
        var url =
            config[$"{service}:Url"]
            ?? throw new InvalidOperationException($"{service}:Url is not configured.");
        http.BaseAddress = new Uri(url.TrimEnd('/') + "/");
        http.Timeout = TimeSpan.FromSeconds(10);
        var key = config[$"{service}:InternalKey"];
        if (!string.IsNullOrEmpty(key))
        {
            http.DefaultRequestHeaders.Add(ServiceCalls.KeyHeader, key);
        }
    }
}
