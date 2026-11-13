using Caps.Common.Persistence;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Infrastructure.Ai;
using Caps.Workflow.Infrastructure.Clients;
using Caps.Workflow.Infrastructure.Persistence;
using Caps.Workflow.Infrastructure.Persistence.Repositories;
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
        services.AddScoped<ITemplateRepository, TemplateRepository>();
        services.AddScoped<IConversationRepository, ConversationRepository>();
        services.AddScoped<IChatMessageRepository, ChatMessageRepository>();
        services.AddScoped<IAiQuotaRepository, AiQuotaRepository>();
        services.AddScoped<IAiUsageRepository, AiUsageRepository>();
        services.AddScoped<IDocumentRepository, DocumentRepository>();
        services.AddScoped<IDocumentVersionRepository, DocumentVersionRepository>();
        services.AddScoped<IInputSnapshotRepository, InputSnapshotRepository>();

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
}
