using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;

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

    /// <summary>How long a reviewer keeps a claimed Gate 1 or Gate 2 review.</summary>
    Task<ReviewClaimPolicy> GetReviewClaimAsync(CancellationToken ct);

    /// <summary>Information rounds per review and the queue waiting time, for Gate 1 and Gate 2.</summary>
    Task<ReviewWorkPolicy> GetReviewWorkAsync(CancellationToken ct);

    /// <summary>How long the final approval may take after Gate 2 PASS.</summary>
    Task<FinalApprovalPolicy> GetFinalApprovalAsync(CancellationToken ct);
}
