using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>The expert's price and turnaround for one service, frozen into a case when the client books it.</summary>
public sealed record ReviewOffer(
    Guid ExpertProfileId,
    Guid ServiceOfferingId,
    long Fee,
    short PlatformFeePct,
    int TurnaroundHours
);

/// <summary>An expert review of one document version, from request through payment and delivery to acceptance.</summary>
public sealed class ReviewCase
{
    // ponytail: response window not given by the spec, 24h until the team decides
    public static readonly TimeSpan ResponseWindow = TimeSpan.FromHours(24);
    public static readonly TimeSpan PaymentWindow = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan StartWindow = TimeSpan.FromHours(24);
    public static readonly TimeSpan InformationWindow = TimeSpan.FromHours(72);
    public static readonly TimeSpan AcceptanceWindow = TimeSpan.FromHours(72);

    public const int MaxTurnaroundHours = 720;
    public const int MaxPlatformFeePct = 99;
    public const int MaxTextLength = 4000;
    public const string Verified = "VERIFIED";
    public const string CannotVerify = "CANNOT_VERIFY";
    public const string UserNonResponse = "USER_NON_RESPONSE";

    private ReviewCase() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid DocumentId { get; private set; }
    public Guid SourceVersionId { get; private set; }
    public Guid RequesterUserId { get; private set; }
    public Guid ExpertProfileId { get; private set; }

    /// <summary>Unused since capacity replaced slots; kept because the column exists.</summary>
    public Guid? SlotId { get; }
    public Guid? ServiceOfferingId { get; private set; }

    /// <summary>Price, platform fee and turnaround frozen at booking; later price changes do not touch them.</summary>
    public long Fee { get; private set; }
    public short PlatformFeePct { get; private set; }
    public int TurnaroundHours { get; private set; }

    public string ProblemDescription { get; private set; } = default!;
    public string? ExpectedOutcome { get; private set; }
    public string Status { get; private set; } = ReviewCaseStatus.PendingExpertResponse;
    public string? Result { get; private set; }
    public string? CannotVerifyReason { get; private set; }
    public string? ReviewSummary { get; private set; }
    public string? DeclineReason { get; private set; }
    public string? TerminationReason { get; private set; }
    public DateTimeOffset ResponseDeadline { get; private set; }
    public DateTimeOffset? AcceptedAt { get; private set; }
    public DateTimeOffset? PaymentDeadline { get; private set; }
    public DateTimeOffset? PaidAt { get; private set; }
    public DateTimeOffset? StartDeadline { get; private set; }
    public DateTimeOffset? StartedAt { get; private set; }
    public DateTimeOffset? DeliveryDeadline { get; private set; }
    public DateTimeOffset? DeliveredAt { get; private set; }
    public DateTimeOffset? AcceptanceDeadline { get; private set; }
    public DateTimeOffset? CompletedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public ICollection<ReviewTask> ReviewTasks { get; } = [];
    public ICollection<InfoRequest> InfoRequests { get; } = [];
    public ICollection<ReviewAttachment> Attachments { get; } = [];
    public ICollection<ReviewStatusHistory> StatusHistories { get; } = [];

    public static (ReviewCase Case, ReviewStatusHistory Opened) Request(
        Guid requesterUserId,
        Guid documentId,
        Guid sourceVersionId,
        ReviewOffer offer,
        string? problemDescription,
        string? expectedOutcome,
        DateTimeOffset now
    )
    {
        // The offer comes from the expert service; never trust it blindly
        if (
            offer.Fee <= 0
            || offer.PlatformFeePct < 0
            || offer.PlatformFeePct > MaxPlatformFeePct
            || offer.TurnaroundHours < 1
            || offer.TurnaroundHours > MaxTurnaroundHours
        )
        {
            throw WorkflowErrors.OfferInvalid();
        }

        var reviewCase = new ReviewCase
        {
            RequesterUserId = requesterUserId,
            DocumentId = documentId,
            SourceVersionId = sourceVersionId,
            ExpertProfileId = offer.ExpertProfileId,
            ServiceOfferingId = offer.ServiceOfferingId,
            Fee = offer.Fee,
            PlatformFeePct = offer.PlatformFeePct,
            TurnaroundHours = offer.TurnaroundHours,
            ProblemDescription = RequiredText(problemDescription, "Problem description"),
            ExpectedOutcome = OptionalText(expectedOutcome, "Expected outcome"),
            ResponseDeadline = now + ResponseWindow,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var opened = ReviewStatusHistory.Record(
            reviewCase.Id,
            null,
            reviewCase.Status,
            requesterUserId,
            null,
            now
        );
        return (reviewCase, opened);
    }

    /// <summary>Not found (not forbidden) for anyone else, so other experts cannot probe case ids.</summary>
    public void EnsureExpert(Guid expertProfileId)
    {
        if (expertProfileId != ExpertProfileId)
        {
            throw WorkflowErrors.ReviewCaseNotFound();
        }
    }

    public void EnsureRequester(Guid userId)
    {
        if (userId != RequesterUserId)
        {
            throw WorkflowErrors.ReviewCaseNotFound();
        }
    }

    public ReviewStatusHistory Accept(Guid expertProfileId, Guid actorUserId, DateTimeOffset now)
    {
        EnsureExpert(expertProfileId);
        EnsureStep(ReviewCaseStatus.PendingExpertResponse, ResponseDeadline, now);
        AcceptedAt = now;
        PaymentDeadline = now + PaymentWindow;
        return MoveTo(ReviewCaseStatus.AwaitingPayment, actorUserId, null, now);
    }

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

    /// <summary>Billing confirmed the money. A late payment throws, so the caller refunds it.</summary>
    public ReviewStatusHistory ConfirmPayment(DateTimeOffset now)
    {
        EnsureStep(ReviewCaseStatus.AwaitingPayment, PaymentDeadline, now);
        PaidAt = now;
        StartDeadline = now + StartWindow;
        return MoveTo(ReviewCaseStatus.PaymentConfirmed, null, null, now);
    }

    public ReviewStatusHistory Start(Guid expertProfileId, Guid actorUserId, DateTimeOffset now)
    {
        EnsureExpert(expertProfileId);
        EnsureStep(ReviewCaseStatus.PaymentConfirmed, StartDeadline, now);
        StartedAt = now;
        DeliveryDeadline = now + TimeSpan.FromHours(TurnaroundHours);
        return MoveTo(ReviewCaseStatus.InReview, actorUserId, null, now);
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
        var request = InfoRequest.Create(
            Id,
            actorUserId,
            RequiredText(message, "Message"),
            now + InformationWindow,
            now
        );
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
        EnsureStatus(ReviewCaseStatus.InReview);
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

    /// <summary>
    /// Moves an overdue case to its timeout status (used by the crons). Returns null when nothing is
    /// overdue, so a cron that runs twice changes nothing.
    /// </summary>
    public ReviewStatusHistory? ExpireIfOverdue(DateTimeOffset now)
    {
        var status = Status switch
        {
            ReviewCaseStatus.PendingExpertResponse when now >= ResponseDeadline =>
                ReviewCaseStatus.RequestExpired,
            ReviewCaseStatus.AwaitingPayment when now >= PaymentDeadline =>
                ReviewCaseStatus.CancelledUnpaid,
            ReviewCaseStatus.PaymentConfirmed when now >= StartDeadline =>
                ReviewCaseStatus.ExpertTimeout,
            ReviewCaseStatus.AwaitingAcceptance when now >= AcceptanceDeadline =>
                ReviewCaseStatus.AutoConfirmed,
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

    private void EnsureStatus(string expected)
    {
        if (Status != expected)
        {
            throw WorkflowErrors.CaseStatusInvalid(Status);
        }
    }

    private void EnsureStep(string expected, DateTimeOffset? deadline, DateTimeOffset now)
    {
        EnsureStatus(expected);
        if (now >= deadline)
        {
            throw WorkflowErrors.DeadlinePassed();
        }
    }

    private ReviewStatusHistory MoveTo(
        string status,
        Guid? actorUserId,
        string? note,
        DateTimeOffset now
    )
    {
        var history = ReviewStatusHistory.Record(Id, Status, status, actorUserId, note, now);
        Status = status;
        UpdatedAt = now;
        return history;
    }

    private static string RequiredText(string? value, string field)
    {
        var text = value?.Trim();
        if (string.IsNullOrEmpty(text) || text.Length > MaxTextLength)
        {
            throw WorkflowErrors.TextRequired(field, MaxTextLength);
        }
        return text;
    }

    private static string? OptionalText(string? value, string field)
    {
        var text = value?.Trim();
        if (text?.Length > MaxTextLength)
        {
            throw WorkflowErrors.TextTooLong(field, MaxTextLength);
        }
        return string.IsNullOrEmpty(text) ? null : text;
    }
}
