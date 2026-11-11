using Caps.Common.Persistence;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Infrastructure.Clients;
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

        //repositories
        services.AddScoped<IReviewCaseRepository, ReviewCaseRepository>();
        services.AddScoped<ICaseMessageRepository, CaseMessageRepository>();
        services.AddScoped<ICaseReadMarkerRepository, CaseReadMarkerRepository>();

        // RAG query http client
        var ragServiceBaseUrl = configuration["Services:BaseUrl"] ?? "http://rag-query:5200";
        services.AddHttpClient<IRagQueryClient, RagQueryClient>(client =>
        {
            client.BaseAddress = new Uri(ragServiceBaseUrl);
            client.Timeout = TimeSpan.FromSeconds(60);
        });

        return services;
    }
}
