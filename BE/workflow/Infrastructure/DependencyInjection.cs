using Caps.Common.Persistence;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Infrastructure.Integrations;
using Caps.Workflow.Infrastructure.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Workflow.Infrastructure;

/// <summary>Registers the workflow adapters, starting with its database.</summary>
public static class DependencyInjection
{
    /// <summary>The workflow database (shared unit of work, readiness check) behind the application ports.</summary>
    public static IServiceCollection AddWorkflowInfrastructure(
        this IServiceCollection services,
        string connectionString
    )
    {
        services.AddServiceDatabase<WorkflowDbContext>(
            connectionString,
            "Workflow",
            "workspace",
            "review"
        );
        services.AddScoped<IReviewCaseRepository, ReviewCaseRepository>();
        services.AddScoped<ICaseMessageRepository, CaseMessageRepository>();
        services.AddScoped<ICaseReadMarkerRepository, CaseReadMarkerRepository>();
        services.AddScoped<IDocumentRepository, DocumentRepository>();
        services.AddScoped<IInfoRequestRepository, InfoRequestRepository>();
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
        services.AddHttpClient<BillingServiceClient>(http => Link(http, config, "Billing"));
        services.AddScoped<IEscrows>(sp => sp.GetRequiredService<BillingServiceClient>());
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
