namespace Caps.Workflow.Domain.Review;

// How a case ends without a user action, and how its fee splits
public sealed partial class ReviewCase
{
    /// <summary>
    /// The split of the held fee. A client who went silent gets the shares frozen at booking (the platform keeps
    /// the rest); otherwise a late delivery's refund comes out of the expert's share, and a full refund leaves
    /// the platform nothing either.
    /// </summary>
    public ReviewSettlement Settle()
    {
        // The admin's decision replaces every other rule; the rest of the fee splits by the frozen pletform
        if (DisputeRefundPct is { } pct)
        {
            var back = Fee * pct / 100;
            var fee = (Fee - back) * PlatformFeePct / 100;
            return new(back, fee, Fee - back - fee);
        }

        if (TerminationReason == UserNonResponse)
        {
            var back = Fee * NoResponseRefundPct / 100;
            var paid = Fee * NoResponseExpertPct / 100;
            return new(back, Fee - back - paid, paid);
        }
        var refund = Fee * LateRefundPct / 100;
        var platform = LateRefundPct == 100 ? 0 : Fee * PlatformFeePct / 100;
        return new(refund, platform, Fee - refund - platform);
    }

    /// <summary>
    /// Moves an overdue case to its timeout status (used by the crons). Returns null when nothing is
    /// overdue, so a cron that runs twice changes nothing.
    /// </summary>
    public ReviewStatusHistory? ExpireIfOverdue(DateTimeOffset now)
    {
        var status = Status switch
        {
            ReviewCaseStatus.AwaitingPayment when now >= PaymentDeadline =>
                ReviewCaseStatus.CancelledUnpaid,
            // Paid but never accepted: the caller refunds the client in full
            ReviewCaseStatus.PendingExpertResponse when now >= ResponseDeadline =>
                ReviewCaseStatus.ExpertTimeout,
            ReviewCaseStatus.AwaitingAcceptance when now >= AcceptanceDeadline =>
                ReviewCaseStatus.AutoConfirmed,
            // Not delivered by the last late hour: the caller refund client full
            ReviewCaseStatus.InReview when now >= CancelAt => ReviewCaseStatus.DeliveryOverdue,
            _ => null,
        };
        if (status is null)
        {
            return null;
        }
        if (status == ReviewCaseStatus.AutoConfirmed)
        {
            CompletedAt = now;
        }
        return MoveTo(status, null, null, now);
    }

    /// <summary>Ends the case when the requester did not answer in time; null when not overdue.</summary>
    public ReviewStatusHistory? TerminateForNoResponse(InfoRequest request, DateTimeOffset now)
    {
        if (
            Status != ReviewCaseStatus.AwaitingUserInformation
            || request.ReviewCaseId != Id
            || !request.Expire(now)
        )
        {
            return null;
        }
        TerminationReason = UserNonResponse;
        CompletedAt = now;
        return MoveTo(ReviewCaseStatus.Terminated, null, UserNonResponse, now);
    }
}
