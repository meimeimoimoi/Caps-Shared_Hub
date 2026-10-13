using Caps.Billing.Application;
using Caps.Common.Api;

namespace Caps.Billing.Api;

/// <summary>Registers the billing Application layer (every use-case handler).</summary>
public static class DependencyInjection
{
    /// <summary>Every command/query handler found in the Application assembly.</summary>
    public static IServiceCollection AddBillingApplication(this IServiceCollection services) =>
        services.AddHandlersFromAssembly(BillingApplication.Assembly);
}
