using Caps.Billing.Application.Abstractions;
using Caps.Billing.Infrastructure.Persistence;
using Caps.Common.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Billing.Infrastructure;

/// <summary>Registers the billing adapters: database and repositories.</summary>
public static class DependencyInjection
{
    /// <summary>The billing database (shared unit of work, readiness check) behind the application ports.</summary>
    public static IServiceCollection AddBillingInfrastructure(
        this IServiceCollection services,
        string connectionString
    )
    {
        services.AddServiceDatabase<BillingDbContext>(connectionString, "Billing", "billing");
        services.AddScoped<ICreditWalletRepository, CreditWalletRepository>();
        return services;
    }
}
