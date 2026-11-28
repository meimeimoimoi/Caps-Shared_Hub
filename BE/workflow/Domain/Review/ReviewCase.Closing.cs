using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

// How a case ends without a user action, and how its fee splits
public sealed partial class ReviewCase
{
    public const string LateViolation = "LATE";
    public const string WithdrewViolation = "WITHDREW";
    public const string NoDeliveryViolation = "NO_DELIVERY";

    /// <summary>
    /// The violation a step records against the expert (2026-11-20), or null. Lateness is measured against the
    /// delivery deadline, so an extension the client agreed to moves it and the case is no longer late.
    /// </summary>
    public string? ViolationOf(ReviewStatusHistory change) =>
        change.ToStatus switch
        {
            ReviewCaseStatus.DeliveryOverdue => NoDeliveryViolation,
            ReviewCaseStatus.ExpertDeclined when change.Note == ExpertWithdrew => WithdrewViolation,
            ReviewCaseStatus.AwaitingAcceptance when DeliveredAt > DeliveryDeadline =>
                LateViolation,
            _ => null,
        };

    /// <summary>
    /// The split of the held fee. A client who went silent gets the shares frozen at booking. An upheld dispute
    /// or no delivery at all refunds one share to the client, the platform keeps the rest and the expert gets
    /// nothing. A late delivery (2026-11-20) refunds the client out of the platform's share and the expert keeps
    /// theirs; otherwise the platform fee splits as booked.
    /// </summary>
    public ReviewSettlement Settle()
    {
        if (TerminationReason == UserNonResponse)
        {
            var back = Fee * NoResponseRefundPct / 100;
            var paid = Fee * NoResponseExpertPct / 100;
            return new(back, Fee - back - paid, paid);
        }
        // Upheld dispute or no delivery: the client gets one share, the platform the rest, the expert nothing
        if (Status == ReviewCaseStatus.DeliveryOverdue || DisputeRefundPct > 0)
        {
            var incident =
                Status == ReviewCaseStatus.DeliveryOverdue
                    ? NoDeliveryRefundPct
                    : Math.Max(LateRefundPct, DisputeRefundPct!.Value);
            var refund = Fee * incident / 100;
            return new(refund, Fee - refund, 0);
        }
        // Late but delivered (2026-11-20): the refund comes out of the platform's share, the expert keeps theirs
        return DeliveredSplit(LateRefundPct);
    }

    /// <summary>The split of this case if delivered with latePct back to the client (0 when on time).</summary>
    public ReviewSettlement DeliveredSplit(short latePct) =>
        ReviewSettlement.Delivered(Fee, PlatformFeePct, latePct);

    /// <summary>A percentage of the fee in VND, rounded down like every split.</summary>
    public long ShareOf(short pct) => Fee * pct / 100;

    /// <summary>
    /// How the fee ended up, once the case is over: the split for a delivered, terminated or undelivered case, a
    /// full refund for one the expert never took; null while it runs or when nothing was paid.
    /// </summary>
    public ReviewSettlement? Outcome() =>
        Status switch
        {
            ReviewCaseStatus.Completed
            or ReviewCaseStatus.AutoConfirmed
            or ReviewCaseStatus.Resolved
            or ReviewCaseStatus.Terminated
            or ReviewCaseStatus.DeliveryOverdue => Settle(),
            ReviewCaseStatus.ExpertDeclined
            or ReviewCaseStatus.ExpertTimeout
            or ReviewCaseStatus.Withdrawn => new(Fee, 0, 0),
            _ => null,
        };

    /// <summary>
    /// Moves an overdue case to its timeout status (used by the crons). Returns null when nothing is
    /// overdue, so a cron that runs twice changes nothing.
    /// </summary>
    public ReviewStatusHistory? ExpireIfOverdue(DateTimeOffset now, WorkCalendar? calendar = null)
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
            // Not delivered by the last late hour: the caller settles the frozen no-delivery split
            ReviewCaseStatus.InReview when now >= CancelAt(calendar) =>
                ReviewCaseStatus.DeliveryOverdue,
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

    /// <summary>The client kept a VERIFIED result: accepted, auto-confirmed, or a dispute that did not refund it all.</summary>
    public bool VerifiedOutcome =>
        Result == Verified
        && (
            Status is ReviewCaseStatus.Completed or ReviewCaseStatus.AutoConfirmed
            || (Status == ReviewCaseStatus.Resolved && DisputeRefundPct < 100)
        );
}
