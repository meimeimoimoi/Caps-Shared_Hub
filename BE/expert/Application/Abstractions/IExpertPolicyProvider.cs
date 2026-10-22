using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Application.Abstractions;

/// <summary>
/// Policy values in force now: the configured defaults overlaid with the values a System Admin changed.
/// Changes apply to the next decision without a restart; past decisions keep the values they stored.
/// </summary>
public interface IExpertPolicyProvider
{
    /// <summary>Gate 1 policy: EV-06 minimum years, reapply interval and criteria that may be not applicable.</summary>
    Task<EligibilityPolicy> GetEligibilityAsync(CancellationToken ct);

    /// <summary>Gate 2 policy: wait before registering the same service again after FAIL.</summary>
    Task<CompetencyPolicy> GetCompetencyAsync(CancellationToken ct);
}
