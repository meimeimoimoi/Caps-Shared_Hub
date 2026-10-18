using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application;

/// <summary>Expert policy settings ("ExpertPolicy" section); values are policy parameters, not code (BR-E29).</summary>
public sealed class ExpertPolicyOptions
{
    /// <summary>EV-06 minimum years of tax/accounting experience (BR-E11).</summary>
    public int MinYearsExperience { get; set; } = 5;

    /// <summary>expert.reapply_not_eligible_days: wait after Gate 1 NOT_ELIGIBLE (BR-E21).</summary>
    public int ReapplyNotEligibleDays { get; set; } = 30;

    /// <summary>expert.reapply_competency_fail_days: wait after Gate 2 FAIL for the same service (BR-E22).</summary>
    public int ReapplyCompetencyFailDays { get; set; } = 90;

    public EligibilityPolicy Eligibility =>
        new(MinYearsExperience, TimeSpan.FromDays(ReapplyNotEligibleDays));

    public CompetencyPolicy Competency => new(TimeSpan.FromDays(ReapplyCompetencyFailDays));
}
