using Caps.Billing.Application;
using Caps.Billing.Application.Common;
using Caps.Common.Api;

namespace Caps.Billing.Api;

/// <summary>Registers the billing Application layer (shared services and every use-case handler).</summary>
public static class DependencyInjection
{
    /// <summary>The shared top-up crediting and every command/query handler in the Application assembly.</summary>
    public static IServiceCollection AddBillingApplication(this IServiceCollection services)
    {
        services.AddScoped<ITopupCrediting, TopupCrediting>();
        return services.AddHandlersFromAssembly(BillingApplication.Assembly);
    }
}
