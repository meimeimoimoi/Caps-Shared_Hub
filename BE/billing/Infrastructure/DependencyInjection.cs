using Caps.Billing.Application.Abstractions;
using Caps.Billing.Infrastructure.Payments;
using Caps.Billing.Infrastructure.Persistence;
using Caps.Billing.Infrastructure.Security;
using Caps.Common.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Billing.Infrastructure;

/// <summary>Registers the billing adapters: database, repositories and account number protection.</summary>
public static class DependencyInjection
{
    /// <summary>
    /// The billing database (shared unit of work, readiness check) behind the application ports.
    /// Expects Data Protection, AccountNumberProtectionOptions and PayOsOptions to be registered by the host.
    /// </summary>
    public static IServiceCollection AddBillingInfrastructure(
        this IServiceCollection services,
        string connectionString
    )
    {
        services.AddServiceDatabase<BillingDbContext>(connectionString, "Billing", "billing");
        services.AddScoped<IBillingUserLock, BillingUserLock>();
        services.AddScoped<ICreditWalletRepository, CreditWalletRepository>();
        services.AddScoped<ICreditLedgerRepository, CreditLedgerRepository>();
        services.AddScoped<IBankAccountRepository, BankAccountRepository>();
        services.AddScoped<IPaymentTransactionRepository, PaymentTransactionRepository>();
        services.AddScoped<IPayoutRepository, PayoutRepository>();
        services.AddSingleton<IAccountNumberProtector, AccountNumberProtector>();
        services.AddHttpClient<IPaymentGateway, PayOsClient>(
            (sp, http) =>
            {
                var options = sp.GetRequiredService<PayOsOptions>();
                http.BaseAddress = new Uri(options.BaseUrl.TrimEnd('/') + "/");
                http.Timeout = TimeSpan.FromSeconds(15);
            }
        );
        return services;
    }
}
