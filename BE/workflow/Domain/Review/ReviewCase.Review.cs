namespace Caps.Workflow.Domain.Review;

// The review itself: payment, the expert answering, questions to the client, delivery, confirmation
public sealed partial class ReviewCase
{
    /// <summary>
    /// The expert takes the paid request and the review starts, due one working day later whatever turnaround the
    /// expert advertised; the handler adds one to their active cases.
    /// </summary>
    public ReviewStatusHistory Accept(
        Guid expertProfileId,
        Guid actorUserId,
        DateTimeOffset now,
        WorkCalendar? calendar = null
    )
    {
        EnsureExpert(expertProfileId);
        EnsureStep(ReviewCaseStatus.PendingExpertResponse, ResponseDeadline, now);
        AcceptedAt = now;
        StartedAt = now;
        DeliveryDeadline = (calendar ?? WorkCalendar.WeekendsOnly).AddWorkingDays(
            now,
            WorkingDaysToReview
        );
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
    /// The expert gives up an accepted case before delivering it. It ends as declined (EXPERT_WITHDREW) and the
    /// caller refunds the client in full and frees the slot, so the client never waits out the late rule.
    /// </summary>
    public ReviewStatusHistory WithdrawAccepted(
        Guid expertProfileId,
        Guid actorUserId,
        string? reason,
        DateTimeOffset now
    )
    {
        EnsureExpert(expertProfileId);
        if (Status is not (ReviewCaseStatus.InReview or ReviewCaseStatus.AwaitingUserInformation))
        {
            throw WorkflowErrors.CaseStatusInvalid(Status);
        }
        DeclineReason = RequiredText(reason, "Withdraw reason");
        return MoveTo(ReviewCaseStatus.ExpertDeclined, actorUserId, ExpertWithdrew, now);
    }

    /// <summary>
    /// The client takes the request back before the expert answers. Unpaid, it ends like an unpaid case that
    /// expired (the expert never saw it); paid, it is WITHDRAWN and the caller refunds the fee in full.
    /// </summary>
    public ReviewStatusHistory Withdraw(Guid requesterUserId, DateTimeOffset now)
    {
        EnsureRequester(requesterUserId);
        var next = Status switch
        {
            ReviewCaseStatus.AwaitingPayment => ReviewCaseStatus.CancelledUnpaid,
            ReviewCaseStatus.PendingExpertResponse => ReviewCaseStatus.Withdrawn,
            _ => throw WorkflowErrors.CaseStatusInvalid(Status),
        };
        return MoveTo(next, requesterUserId, ClientWithdrew, now);
    }

    /// <summary>
    /// The expert can no longer answer this paid request (EXPERT_FULL, SERVICE_SUSPENDED): the system closes it as
    /// declined and the caller refunds the client in full.
    /// </summary>
    public ReviewStatusHistory CloseUnanswered(string reason, DateTimeOffset now)
    {
        EnsureStatus(ReviewCaseStatus.PendingExpertResponse);
        DeclineReason = reason;
        return MoveTo(ReviewCaseStatus.ExpertDeclined, null, reason, now);
    }

    /// <summary>
    /// Billing confirmed the money; the expert now has the response window to accept. A late payment
    /// throws, so the caller refunds it.
    /// </summary>
    public ReviewStatusHistory ConfirmPayment(DateTimeOffset now, WorkCalendar? calendar = null)
    {
        EnsureStep(ReviewCaseStatus.AwaitingPayment, PaymentDeadline, now);
        PaidAt = now;
        ResponseDeadline = (calendar ?? WorkCalendar.WeekendsOnly).AddWorkingDays(
            now,
            WorkingDaysToRespond
        );
        return MoveTo(ReviewCaseStatus.PendingExpertResponse, null, null, now);
    }

    public (InfoRequest Request, ReviewStatusHistory History) RequestInformation(
        Guid expertProfileId,
        Guid actorUserId,
        string? message,
        DateTimeOffset now,
        WorkCalendar? calendar = null
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
            (calendar ?? WorkCalendar.WeekendsOnly).AddWorkingDays(now, NoResponseDays),
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

    /// <summary>Saves the expert's draft revision; it goes out with the delivery unless replaced.</summary>
    public void SaveRevision(Guid expertProfileId, string? revisedContent, DateTimeOffset now)
    {
        EnsureExpert(expertProfileId);
        if (Status is not (ReviewCaseStatus.InReview or ReviewCaseStatus.AwaitingUserInformation))
        {
            throw WorkflowErrors.CaseStatusInvalid(Status);
        }
        if (revisedContent is null || !IsJsonObject(revisedContent))
        {
            throw WorkflowErrors.RevisedContentInvalid();
        }
        RevisedContent = revisedContent;
        UpdatedAt = now;
    }

    public ReviewStatusHistory Deliver(
        Guid expertProfileId,
        Guid actorUserId,
        string? result,
        string? summary,
        string? cannotVerifyReason,
        string[]? citations,
        bool attested,
        DateTimeOffset now,
        string? revisedContent = null,
        WorkCalendar? calendar = null
    )
    {
        EnsureExpert(expertProfileId);
        EnsureStep(ReviewCaseStatus.InReview, CancelAt, now);
        if (result is not (Verified or CannotVerify))
        {
            throw WorkflowErrors.ResultInvalid();
        }
        if (!attested)
        {
            throw WorkflowErrors.AttestationRequired();
        }
        // Validate everything before changing state
        var text = RequiredText(summary, "Review summary");
        var reason =
            result == CannotVerify
                ? RequiredText(cannotVerifyReason, "Cannot-verify reason")
                : null;
        var sources = (citations ?? []).Select(x => x.Trim()).Where(x => x.Length > 0).ToArray();
        if (
            (result == Verified && sources.Length == 0)
            || sources.Length > MaxCitations
            || sources.Any(x => x.Length > MaxCitationLength)
        )
        {
            throw WorkflowErrors.CitationsInvalid();
        }
        if (revisedContent is not null && !IsJsonObject(revisedContent))
        {
            throw WorkflowErrors.RevisedContentInvalid();
        }
        var late = now - DeliveryDeadline!.Value;
        LateRefundPct =
            late <= TimeSpan.Zero ? (short)0
            : late <= TimeSpan.FromHours(LatePenaltyHours) ? LatePenaltyPct
            : (short)100;
        Result = result;
        ReviewSummary = text;
        CannotVerifyReason = reason;
        Citations = sources;
        RevisedContent = revisedContent ?? RevisedContent;
        DeliveredAt = now;
        AcceptanceDeadline = (calendar ?? WorkCalendar.WeekendsOnly).AddWorkingDays(
            now,
            WorkingDaysToAccept
        );
        return MoveTo(ReviewCaseStatus.AwaitingAcceptance, actorUserId, AttestationNote, now);
    }

    public ReviewStatusHistory Confirm(Guid requesterUserId, DateTimeOffset now)
    {
        EnsureRequester(requesterUserId);
        EnsureStatus(ReviewCaseStatus.AwaitingAcceptance);
        CompletedAt = now;
        return MoveTo(ReviewCaseStatus.Completed, requesterUserId, null, now);
    }
}
