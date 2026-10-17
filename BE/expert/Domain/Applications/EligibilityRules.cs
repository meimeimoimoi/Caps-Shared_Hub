namespace Caps.Expert.Domain.Applications;

/// <summary>Policy values of Gate 1, kept in configuration rather than in code (BR-E11, BR-E29).</summary>
/// <param name="MinYearsExperience">EV-06 threshold: 5 years under the current policy.</param>
/// <param name="ReapplyAfterNotEligible">Wait before a new application after NOT_ELIGIBLE: 30 days under the current policy.</param>
public sealed record EligibilityPolicy(int MinYearsExperience, TimeSpan ReapplyAfterNotEligible);

/// <summary>The status change of a Gate 1 decision and the per-requirement results stored with it.</summary>
public sealed record EligibilityDecision(
    ExpertApplicationEvent Event,
    IReadOnlyList<EligibilityCheck> Checks
);

/// <summary>Checks a reviewer's Gate 1 results and derives the outcome (POL-EXP-01, state model 4.1).</summary>
public static class EligibilityRules
{
    /// <summary>
    /// Requires exactly one known result for each of EV-01…EV-06, a note for every result other than PASS,
    /// and refuses PASS on EV-06 when the declared years are below the policy minimum.
    /// </summary>
    /// <returns>The results in display order with trimmed notes.</returns>
    public static IReadOnlyList<CriterionResult> Validate(
        IReadOnlyCollection<CriterionResult> results,
        int? yearsExperience,
        EligibilityPolicy policy
    )
    {
        var byCode = new Dictionary<string, CriterionResult>();
        foreach (var result in results)
        {
            var code = result.Code.Trim();
            if (!EligibilityCriteria.Codes.Contains(code) || !byCode.TryAdd(code, result))
                throw ExpertErrors.InvalidEligibilityCriteria();
            if (!EligibilityCriteria.Results.Contains(result.Result))
                throw ExpertErrors.InvalidEligibilityResult(code);
        }
        if (byCode.Count != EligibilityCriteria.Codes.Length)
            throw ExpertErrors.InvalidEligibilityCriteria();

        var cleaned = EligibilityCriteria
            .Codes.Select(code =>
            {
                var result = byCode[code];
                var note = string.IsNullOrWhiteSpace(result.Note) ? null : result.Note.Trim();
                if (result.Result != EligibilityCriteria.Pass && note == null)
                    throw ExpertErrors.EligibilityNoteRequired(code);
                return new CriterionResult(code, result.Result, note);
            })
            .ToArray();

        var experience = cleaned.Single(x => x.Code == EligibilityCriteria.ExperienceCode);
        if (
            experience.Result == EligibilityCriteria.Pass
            && (yearsExperience ?? 0) < policy.MinYearsExperience
        )
        {
            throw ExpertErrors.ExperienceBelowMinimum(policy.MinYearsExperience);
        }
        return cleaned;
    }

    /// <summary>Any FAIL → NOT_ELIGIBLE; otherwise any NEED_MORE_INFORMATION → NEED_MORE_INFORMATION; else ELIGIBLE.</summary>
    public static string Outcome(IEnumerable<CriterionResult> results)
    {
        var values = results.Select(x => x.Result).ToArray();
        if (values.Contains(EligibilityCriteria.Fail))
            return ExpertApplicationStatus.NotEligible;
        return values.Contains(EligibilityCriteria.NeedMoreInformation)
            ? ExpertApplicationStatus.NeedMoreInformation
            : ExpertApplicationStatus.Eligible;
    }

    /// <summary>The EV-06 result the declared years point to; the reviewer still confirms it.</summary>
    public static string SuggestExperience(int? yearsExperience, EligibilityPolicy policy) =>
        (yearsExperience ?? 0) >= policy.MinYearsExperience
            ? EligibilityCriteria.Pass
            : EligibilityCriteria.Fail;
}
