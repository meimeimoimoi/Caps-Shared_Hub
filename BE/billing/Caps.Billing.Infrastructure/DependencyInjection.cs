using Caps.Billing.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Billing.Infrastructure;

public static class DependencyInjection
{
    /// <summary>Persistence behind the application ports.</summary>
    public static IServiceCollection AddBillingInfrastructure(
        this IServiceCollection services,
        string connectionString
    )
    {
        services.AddDbContext<BillingDbContext>(o =>
            o.UseNpgsql(
                connectionString,
                n => n.MigrationsHistoryTable("__EFMigrationsHistory_Billing", "billing")
            )
        );
        return services;
    }
}
