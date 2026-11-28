using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

// The client's complaint about a delivery and the admin's decision
public sealed partial class ReviewCase
{
    /// <summary>
    /// The client complains about the delivery before accepting it; auto-confirm stops until an admin decides.
    /// Once per case: a case never returns to awaiting acceptance.
    /// </summary>
    public (ReviewDispute Dispute, ReviewStatusHistory History) OpenDispute(
        Guid requesterUserId,
        string? reason,
        string? description,
        DateTimeOffset now,
        WorkCalendar? calendar = null
    )
    {
        EnsureRequester(requesterUserId);
        EnsureStep(ReviewCaseStatus.AwaitingAcceptance, AcceptanceDeadline, now);
        if (reason is null || !ReviewDispute.Reasons.Contains(reason))
        {
            throw WorkflowErrors.DisputeReasonInvalid();
        }
        var dispute = ReviewDispute.Create(
            Id,
            reason,
            RequiredText(description, "Description"),
            now,
            calendar ?? WorkCalendar.WeekendsOnly
        );
        return (dispute, MoveTo(ReviewCaseStatus.Disputed, requesterUserId, reason, now));
    }

    /// <summary>The expert's one explanation, for the admin to read before deciding.</summary>
    public void AddExpertStatement(
        ReviewDispute dispute,
        Guid expertProfileId,
        string? statement,
        DateTimeOffset now
    )
    {
        EnsureExpert(expertProfileId);
        EnsureDispute(dispute);
        dispute.AddStatement(RequiredText(statement, "Statement"), now);
    }

    /// <summary>
    /// The admin's decision: rejected (0) or upheld (DisputeUpheldRefundPct back to the client, the platform keeps
    /// the rest); the caller settles the escrow.
    /// The admin waits for the expert's statement, or for its window to end.
    /// </summary>
    public ReviewStatusHistory ResolveDispute(
        ReviewDispute dispute,
        Guid adminUserId,
        short refundPct,
        string? note,
        DateTimeOffset now
    )
    {
        EnsureDispute(dispute);
        if (refundPct is not (0 or DisputeUpheldRefundPct))
        {
            throw WorkflowErrors.DisputeRefundInvalid();
        }
        var reason = RequiredText(note, "Decision note");
        dispute.EnsureDecidable(now);
        dispute.Resolve(adminUserId, refundPct, reason, now);
        DisputeRefundPct = refundPct;
        CompletedAt = now;
        return MoveTo(ReviewCaseStatus.Resolved, adminUserId, reason, now);
    }

    /// <summary>The client drops the complaint, which accepts the delivery; the caller settles as for a confirm.</summary>
    public ReviewStatusHistory WithdrawDispute(
        ReviewDispute dispute,
        Guid requesterUserId,
        DateTimeOffset now
    )
    {
        EnsureRequester(requesterUserId);
        EnsureDispute(dispute);
        dispute.Withdraw(now);
        CompletedAt = now;
        return MoveTo(ReviewCaseStatus.Completed, requesterUserId, null, now);
    }

    private void EnsureDispute(ReviewDispute dispute)
    {
        EnsureStatus(ReviewCaseStatus.Disputed);
        if (dispute.ReviewCaseId != Id)
        {
            throw WorkflowErrors.ReviewCaseNotFound();
        }
    }
}
