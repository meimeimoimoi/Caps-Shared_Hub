using Caps.Billing.Infrastructure.Payments;

namespace Caps.Billing.Api.Configuration;

/// <summary>PayOS settings from the "PayOS" section; the keys belong in user-secrets or environment variables.</summary>
public static class BillingPaymentSetup
{
    public static IServiceCollection AddBillingPayments(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services.AddSingleton(config.GetSection("PayOS").Get<PayOsOptions>() ?? new PayOsOptions());
        return services;
    }
}
