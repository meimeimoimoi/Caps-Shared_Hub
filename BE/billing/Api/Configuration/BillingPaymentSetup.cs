using Caps.Billing.Infrastructure.Payments;
using Caps.Common.Domain;

namespace Caps.Billing.Api.Configuration;

/// <summary>
/// PayOS settings from the "PayOS" section (keys belong in user-secrets or environment variables) and the
/// working-day calendar used for payout deadlines.
/// </summary>
public static class BillingPaymentSetup
{
    public static IServiceCollection AddBillingPayments(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services.AddSingleton(config.GetSection("PayOS").Get<PayOsOptions>() ?? new PayOsOptions());
        // Fixed solar holidays as MM-dd under WorkCalendar:Holidays, every year; Saturdays and Sundays never count
        services.AddSingleton(
            new WorkCalendar(config.GetSection("WorkCalendar:Holidays").Get<string[]>() ?? [])
        );
        return services;
    }
}
