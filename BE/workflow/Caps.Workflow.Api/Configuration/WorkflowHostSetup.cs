using Caps.Common.Api;
using Caps.Common.Persistence;
using Caps.Workflow.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Api.Configuration;

/// <summary>Host wiring for the workflow service, one concern per method; Program.cs only composes them.</summary>
public static class WorkflowHostSetup
{
    public static WebApplication UseWorkflowPipeline(this WebApplication app, string connectionString)
    {
        if (
            app.Environment.IsDevelopment()
            && app.Configuration.GetValue("Workflow:ApplyMigrations", true)
        )
        {
            DbInitializer.EnsureDatabaseCreated(connectionString, "workspace", "review");
            using var scope = app.Services.CreateScope();
            scope.ServiceProvider.GetRequiredService<WorkflowDbContext>().Database.Migrate();
        }
        app.UseCommonApi();
        return app;
    }
}
