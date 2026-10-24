using Caps.Expert.Application;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Policies;
using Microsoft.Extensions.Options;

namespace Caps.Expert.Api.Configuration;

/// <summary>
/// Expert policy parameters ("ExpertPolicy" section), validated at startup. Adjustable values are defaults that a
/// System Admin may override at runtime.
/// </summary>
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
                    && x.ReapplyCompetencyFailDays >= 0,
                "ExpertPolicy values cannot be negative."
            )
            .Validate(
                x =>
                    x.AdjustableDefaults.All(d =>
                        d.Value >= PolicySettingKeys.Ranges[d.Key].Min
                        && d.Value <= PolicySettingKeys.Ranges[d.Key].Max
                    ),
                "ExpertPolicy defaults must be within the ranges an admin can set."
            )
            .Validate(
                x =>
                    x.AllowedNotApplicableCriteria.All(EligibilityCriteria.Codes.Contains)
                    && (x.Submission.DeclarationCriteria ?? new Dictionary<string, string[]>())
                        .Values.SelectMany(c => c)
                        .All(EligibilityCriteria.Codes.Contains),
                "ExpertPolicy NotApplicableCriteria and DeclarationCriteria must name known criteria (EV-01 to EV-06)."
            )
            // A typo in a statement code would silently stop EV-04/EV-05 passing on the statement
            .Validate(
                x => DeclarationMapping(x).Keys.All(DeclarationCodes(x).Contains),
                "ExpertPolicy DeclarationCriteria must use statement codes listed in Declarations."
            )
            // A tick must not stand in for required documents or for the experience threshold
            .Validate(
                x => DeclarationMapping(x).Values.SelectMany(c => c).All(c => !IsCore(x, c)),
                "ExpertPolicy DeclarationCriteria cannot include evidence groups required on submission or EV-06."
            )
            // NOT_APPLICABLE counts as PASS, so it must never skip a core or statement-proven criterion
            .Validate(
                x =>
                    x.AllowedNotApplicableCriteria.All(c =>
                        !IsCore(x, c)
                        && !DeclarationMapping(x).Values.Any(proven => proven.Contains(c))
                    ),
                "ExpertPolicy NotApplicableCriteria cannot include required evidence groups, EV-06 or criteria proven by a statement."
            )
            .ValidateOnStart();
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<ExpertPolicyOptions>>().Value);
        return services;
    }

    private static IReadOnlyDictionary<string, string[]> DeclarationMapping(
        ExpertPolicyOptions options
    ) => options.Submission.DeclarationCriteria ?? new Dictionary<string, string[]>();

    private static string[] DeclarationCodes(ExpertPolicyOptions options) =>
        options.Submission.Declarations.Select(d => d.Code).Distinct().ToArray();

    /// <summary>Evidence groups that must hold a file on submission, and the EV-06 experience threshold.</summary>
    private static bool IsCore(ExpertPolicyOptions options, string criterion) =>
        criterion == EligibilityCriteria.TaxAccountingExperience
        || options.Submission.RequiredEvidenceCodes.Contains(criterion);
}
