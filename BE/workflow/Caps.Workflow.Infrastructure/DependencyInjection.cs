using Caps.Common.Persistence;
using Caps.Workflow.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Workflow.Infrastructure;

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
        return services;
    }
}
