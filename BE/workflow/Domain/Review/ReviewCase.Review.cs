namespace Caps.Workflow.Domain.Review;

// The review itself: payment, the expert answering, questions to the client, delivery, confirmation
public sealed partial class ReviewCase
{
    /// <summary>The expert takes the paid request and the review starts; the handler adds one to their active cases.</summary>
    public ReviewStatusHistory Accept(Guid expertProfileId, Guid actorUserId, DateTimeOffset now)
    {
        EnsureExpert(expertProfileId);
        EnsureStep(ReviewCaseStatus.PendingExpertResponse, ResponseDeadline, now);
        AcceptedAt = now;
        StartedAt = now;
        DeliveryDeadline = now + TimeSpan.FromHours(TurnaroundHours);
        return MoveTo(ReviewCaseStatus.InReview, actorUserId, null, now);
    }

    /// <summary>The expert turns the paid request down; the caller refunds the client in full.</summary>
    public ReviewStatusHistory Decline(
        Guid expertProfileId,
        Guid actorUserId,
        string? reason,
        DateTimeOffset now
    )
    {
        EnsureExpert(expertProfileId);
        EnsureStatus(ReviewCaseStatus.PendingExpertResponse);
        DeclineReason = RequiredText(reason, "Decline reason");
        return MoveTo(ReviewCaseStatus.ExpertDeclined, actorUserId, DeclineReason, now);
    }

    /// <summary>
    /// The expert took their last slot while this paid request waited: the system closes it as declined and the
    /// caller refunds the client in full.
    /// </summary>
    public ReviewStatusHistory CloseForFullExpert(DateTimeOffset now)
    {
        EnsureStatus(ReviewCaseStatus.PendingExpertResponse);
        DeclineReason = ExpertFull;
        return MoveTo(ReviewCaseStatus.ExpertDeclined, null, ExpertFull, now);
    }

    /// <summary>
    /// Billing confirmed the money; the expert now has the response window to accept. A late payment
    /// throws, so the caller refunds it.
    /// </summary>
    public ReviewStatusHistory ConfirmPayment(DateTimeOffset now)
    {
        EnsureStep(ReviewCaseStatus.AwaitingPayment, PaymentDeadline, now);
        PaidAt = now;
        ResponseDeadline = now + ResponseWindow;
        return MoveTo(ReviewCaseStatus.PendingExpertResponse, null, null, now);
    }

    public (InfoRequest Request, ReviewStatusHistory History) RequestInformation(
        Guid expertProfileId,
        Guid actorUserId,
        string? message,
        DateTimeOffset now
    )
    {
        EnsureExpert(expertProfileId);
        EnsureStatus(ReviewCaseStatus.InReview);
        // The clock pauses while the client answer, so unlimited question would stretch the deadline forever
        if (InfoRequestCount >= MaxInfoRequests)
        {
            throw WorkflowErrors.InfoRequestLimit(MaxInfoRequests);
        }
        var request = InfoRequest.Create(
            Id,
            actorUserId,
            RequiredText(message, "Message"),
            now + TimeSpan.FromHours(NoResponseHours),
            now
        );
        InfoRequestCount++;
        return (request, MoveTo(ReviewCaseStatus.AwaitingUserInformation, actorUserId, null, now));
    }

    /// <summary>The requester answers; the delivery deadline moves back by the time spent waiting.</summary>
    public ReviewStatusHistory ProvideInformation(
        InfoRequest request,
        Guid requesterUserId,
        string? message,
        DateTimeOffset now
    )
    {
        EnsureRequester(requesterUserId);
        EnsureStatus(ReviewCaseStatus.AwaitingUserInformation);
        if (request.ReviewCaseId != Id)
        {
            throw WorkflowErrors.ReviewCaseNotFound();
        }
        request.Answer(RequiredText(message, "Answer"), now);
        DeliveryDeadline += now - request.CreatedAt;
        return MoveTo(ReviewCaseStatus.InReview, requesterUserId, null, now);
    }

    public ReviewStatusHistory Deliver(
        Guid expertProfileId,
        Guid actorUserId,
        string? result,
        string? summary,
        string? cannotVerifyReason,
        DateTimeOffset now
    )
    {
        EnsureExpert(expertProfileId);
        EnsureStep(ReviewCaseStatus.InReview, CancelAt, now);
        if (result is not (Verified or CannotVerify))
        {
            throw WorkflowErrors.ResultInvalid();
        }
        // Validate everything before changing state
        var text = RequiredText(summary, "Review summary");
        var reason =
            result == CannotVerify
                ? RequiredText(cannotVerifyReason, "Cannot-verify reason")
                : null;
        var late = now - DeliveryDeadline!.Value;
        LateRefundPct =
            late <= TimeSpan.Zero ? (short)0
            : late <= TimeSpan.FromHours(LatePenaltyHours) ? LatePenaltyPct
            : (short)100;
        Result = result;
        ReviewSummary = text;
        CannotVerifyReason = reason;
        DeliveredAt = now;
        AcceptanceDeadline = now + AcceptanceWindow;
        return MoveTo(ReviewCaseStatus.AwaitingAcceptance, actorUserId, null, now);
    }

    public ReviewStatusHistory Confirm(Guid requesterUserId, DateTimeOffset now)
    {
        EnsureRequester(requesterUserId);
        EnsureStatus(ReviewCaseStatus.AwaitingAcceptance);
        CompletedAt = now;
        return MoveTo(ReviewCaseStatus.Completed, requesterUserId, null, now);
    }
}
