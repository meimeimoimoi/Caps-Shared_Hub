using Caps.Common.Api;
using Caps.Common.Persistence;
using Caps.Billing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Api.Configuration;

/// <summary>Host wiring for the billing service, one concern per method; Program.cs only composes them.</summary>
public static class BillingHostSetup
{
    public static WebApplication UseBillingPipeline(this WebApplication app, string connectionString)
    {
        if (
            app.Environment.IsDevelopment()
            && app.Configuration.GetValue("Billing:ApplyMigrations", true)
        )
        {
            DbInitializer.EnsureDatabaseCreated(connectionString, "billing");
            using var scope = app.Services.CreateScope();
            scope.ServiceProvider.GetRequiredService<BillingDbContext>().Database.Migrate();
        }
        app.UseCommonApi();
        return app;
    }
}
