using Caps.Common.Persistence;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Infrastructure.Integrations;
using Caps.Workflow.Infrastructure.Persistence;
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
        services.AddScoped<IExpertOfferings, PendingExpertOfferings>();
        services.AddScoped<IEscrows, PendingEscrows>();
        return services;
    }
}
