using Caps.Expert.Application;
using Microsoft.Extensions.Options;

namespace Caps.Expert.Api.Configuration;

/// <summary>Expert policy parameters ("ExpertPolicy" section), validated at startup.</summary>
public static class ExpertPolicySetup
{
    /// <summary>Binds the policy and registers the plain object, so handlers do not depend on IOptions.</summary>
    public static IServiceCollection AddExpertPolicy(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services
            .AddOptions<ExpertPolicyOptions>()
            .Bind(config.GetSection("ExpertPolicy"))
            .Validate(
                x =>
                    x.MinYearsExperience >= 0
                    && x.ReapplyNotEligibleDays >= 0
                    && x.ReapplyCompetencyFailDays >= 0
                    && x.PricingMinPrice > 0
                    && x.PricingMaxPrice >= x.PricingMinPrice
                    && x.PricingAutoApproveMaxChangePercent >= 0,
                "ExpertPolicy values cannot be negative and the price range must be valid."
            )
            .ValidateOnStart();
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<ExpertPolicyOptions>>().Value);
        return services;
    }
}
