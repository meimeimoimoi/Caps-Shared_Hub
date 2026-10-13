using Caps.Workflow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Workflow.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Persistence behind the application ports.</summary>
    public static IServiceCollection AddWorkflowInfrastructure(
        this IServiceCollection services,
        string connectionString
    )
    {
        services.AddDbContext<WorkflowDbContext>(o =>
            o.UseNpgsql(
                connectionString,
                n => n.MigrationsHistoryTable("__EFMigrationsHistory_Workflow", "workspace")
            )
        );
        return services;
    }
}
