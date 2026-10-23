namespace Caps.Expert.Domain.Qualifications;

/// <summary>
/// What the final approval (Step 6) changes around Gate 2. A return stays internal: the expert sees one review
/// status from submission to the final result (D4), and the reviewer gets one more information round per
/// return (D9). Everything is derived from the status history, so no
/// extra column is needed.
/// </summary>
public static class FinalApprovalRules
{
    /// <summary>True for the hand-back of a qualification from final approval to Gate 2.</summary>
    public static bool IsReturn(string? fromStatus, string toStatus) =>
        fromStatus == QualificationStatus.PendingFinalApproval
        && toStatus == QualificationStatus.CompetencyReview;

    /// <summary>Times the qualification was returned from final approval.</summary>
    public static int CountReturns(IEnumerable<(string? FromStatus, string ToStatus)> history) =>
        history.Count(x => IsReturn(x.FromStatus, x.ToStatus));

    /// <summary>Information rounds the Gate 2 review may ask for: the policy limit plus one per return (D9).</summary>
    public static int MaxInformationRequests(
        int policyMax,
        IEnumerable<(string? FromStatus, string ToStatus)> history
    ) => policyMax + CountReturns(history);

    /// <summary>The status the expert sees: waiting for final approval reads as competency review (D4).</summary>
    public static string ExpertStatus(string status) =>
        status == QualificationStatus.PendingFinalApproval
            ? QualificationStatus.CompetencyReview
            : status;

    /// <summary>History entries kept from the expert: the move to final approval and every return (D4).</summary>
    public static bool IsInternal(string? fromStatus, string toStatus) =>
        toStatus == QualificationStatus.PendingFinalApproval || IsReturn(fromStatus, toStatus);
}
