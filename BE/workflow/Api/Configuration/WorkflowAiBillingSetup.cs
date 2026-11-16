using Caps.Workflow.Application.Common;

namespace Caps.Workflow.Api.Configuration;

/// <summary>AI quota and wallet credit fallback settings ("AiBilling" section); disabled by default.</summary>
public static class WorkflowAiBillingSetup
{
    /// <summary>Binds <see cref="AiBillingSettings"/> so the business can toggle paid AI chat/draft mode when ready.</summary>
    public static IServiceCollection AddWorkflowAiBilling(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        var settings =
            config.GetSection("AiBilling").Get<AiBillingSettings>() ?? new AiBillingSettings();
        services.AddSingleton(settings);
        return services;
    }
}
