namespace Caps.Expert.Domain.Qualifications;

/// <summary>Policy values of the final approval, kept in configuration rather than in code (BR-E29).</summary>
/// <param name="DueDays">Days the final approval may take after Gate 2 PASS before the queue flags it (D8).</param>
public sealed record FinalApprovalPolicy(int DueDays);

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

    /// <summary>
    /// The latest return when the qualification has not passed Gate 2 again since, so the reviewer sees why it
    /// came back; null otherwise.
    /// </summary>
    /// <param name="history">Status history, oldest first.</param>
    public static QualificationEvent? OpenReturn(IEnumerable<QualificationEvent> history) =>
        history.LastOrDefault(x =>
            x.ToStatus == QualificationStatus.PendingFinalApproval
            || IsReturn(x.FromStatus, x.ToStatus)
        )
            is { } last
        && IsReturn(last.FromStatus, last.ToStatus)
            ? last
            : null;

    /// <summary>The status the expert sees: waiting for final approval reads as competency review (D4).</summary>
    public static string ExpertStatus(string status) =>
        status == QualificationStatus.PendingFinalApproval
            ? QualificationStatus.CompetencyReview
            : status;

    /// <summary>History entries kept from the expert: the move to final approval and every return (D4).</summary>
    public static bool IsInternal(string? fromStatus, string toStatus) =>
        toStatus == QualificationStatus.PendingFinalApproval || IsReturn(fromStatus, toStatus);

    /// <summary>When the final approval is due; it is flagged after that but never approved automatically (D8).</summary>
    /// <param name="passedAt">When Gate 2 passed, i.e. when the qualification entered final approval.</param>
    public static DateTimeOffset DueAt(DateTimeOffset passedAt, FinalApprovalPolicy policy) =>
        passedAt.AddDays(policy.DueDays);

    /// <summary>True once the due time has passed.</summary>
    public static bool IsOverdue(DateTimeOffset passedAt, FinalApprovalPolicy policy, DateTimeOffset now) =>
        now > DueAt(passedAt, policy);
}
