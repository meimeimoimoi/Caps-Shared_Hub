using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>An expert review of one document version, from request through payment and delivery to acceptance.</summary>
public sealed partial class ReviewCase
{
    // response window not given by the spec, 24h until the team decides
    public static readonly TimeSpan ResponseWindow = TimeSpan.FromHours(24);
    public static readonly TimeSpan PaymentWindow = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan AcceptanceWindow = TimeSpan.FromHours(72);

    public const int MaxTurnaroundHours = 720;
    public const int MaxPlatformFeePct = 99;
    public const int MaxTextLength = 4000;
    public const int MaxInfoRequests = 2;
    public const string Verified = "VERIFIED";
    public const string CannotVerify = "CANNOT_VERIFY";
    public const string UserNonResponse = "USER_NON_RESPONSE";
    public const string ExpertFull = "EXPERT_FULL";
    public const string ServiceSuspended = "SERVICE_SUSPENDED";

    /// <summary>The client has not paid: the expert never sees these, and no response deadline runs yet.</summary>
    public static readonly string[] UnpaidStatuses =
    [
        ReviewCaseStatus.AwaitingPayment,
        ReviewCaseStatus.CancelledUnpaid,
    ];

    /// <summary>A case still running: one document version holds at most one per expert.</summary>
    public static readonly string[] OpenStatuses =
    [
        ReviewCaseStatus.AwaitingPayment,
        ReviewCaseStatus.PendingExpertResponse,
        ReviewCaseStatus.InReview,
        ReviewCaseStatus.AwaitingUserInformation,
        ReviewCaseStatus.AwaitingAcceptance,
        ReviewCaseStatus.Disputed,
    ];

    private ReviewCase() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid DocumentId { get; private set; }
    public Guid SourceVersionId { get; private set; }
    public Guid RequesterUserId { get; private set; }

    // The token carries the client's email; kept so they can be emailed when the expert asks them something.
    // Null for cases booked before it was kept
    public string? RequesterEmail { get; private set; }

    public Guid ExpertProfileId { get; private set; }

    // Tokens carry user ids only and the expert schema is off limits, so the expert's user id is copied here
    public Guid ExpertUserId { get; private set; }

    /// <summary>Unused since capacity replaced slots; kept because the column exists.</summary>
    public Guid? SlotId { get; }
    public Guid? ServiceOfferingId { get; private set; }

    /// <summary>The booked service, so suspending it refunds only its requests; null for cases booked before it was kept.</summary>
    public string? ServiceCode { get; private set; }

    /// <summary>Price, platform fee and turnaround frozen at booking; later price changes do not touch them.</summary>
    public long Fee { get; private set; }
    public short PlatformFeePct { get; private set; }
    public int TurnaroundHours { get; private set; }

    /// <summary>
    /// Late rule frozen at booking: up to LatePenaltyHours late the client gets LatePenaltyPct back from the
    /// expert's share, later the whole fee; past LateCancelHours the case is cancelled.
    /// </summary>
    public int LatePenaltyHours { get; private set; }
    public short LatePenaltyPct { get; private set; }
    public int LateCancelHours { get; private set; }

    /// <summary>Share of the fee returned to the client for a late delivery, set when the expert delivers.</summary>
    public short LateRefundPct { get; private set; }

    /// <summary>Share of the fee the admin returned to the client when deciding a dispute; null otherwise.</summary>
    public short? DisputeRefundPct { get; private set; }
    public int InfoRequestCount { get; private set; }

    /// <summary>
    /// Client-silence rule frozen at booking: no answer within NoResponseHours ends the case, the client gets
    /// NoResponseRefundPct back, the expert NoResponseExpertPct, and the platform keeps the rest.
    /// </summary>
    public int NoResponseHours { get; private set; }
    public short NoResponseRefundPct { get; private set; }
    public short NoResponseExpertPct { get; private set; }

    // After this the expert can no longer deliver and the expiry job refunds the client
    private DateTimeOffset? CancelAt => DeliveryDeadline + TimeSpan.FromHours(LateCancelHours);

    public string ProblemDescription { get; private set; } = default!;
    public string? ExpectedOutcome { get; private set; }
    public string Status { get; private set; } = ReviewCaseStatus.AwaitingPayment;
    public string? Result { get; private set; }
    public string? CannotVerifyReason { get; private set; }
    public string? ReviewSummary { get; private set; }
    public string? DeclineReason { get; private set; }
    public string? TerminationReason { get; private set; }
    public DateTimeOffset ResponseDeadline { get; private set; }
    public DateTimeOffset? AcceptedAt { get; private set; }
    public DateTimeOffset? PaymentDeadline { get; private set; }
    public DateTimeOffset? PaidAt { get; private set; }

    /// <summary>Unused: accepting starts the review at once; kept because the column exists.</summary>
    public DateTimeOffset? StartDeadline { get; }
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
        string? requesterEmail,
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
            || offer.LatePenaltyHours < 0
            || offer.LatePenaltyPct < 0
            || offer.PlatformFeePct + offer.LatePenaltyPct > 100
            || offer.LateCancelHours < offer.LatePenaltyHours
            || offer.LateCancelHours > MaxTurnaroundHours
            || offer.NoResponseHours < 1
            || offer.NoResponseHours > MaxTurnaroundHours
            || offer.NoResponseRefundPct < 0
            || offer.NoResponseExpertPct < 0
            || offer.NoResponseRefundPct + offer.NoResponseExpertPct > 100
        )
        {
            throw WorkflowErrors.OfferInvalid();
        }

        // An expert booking their own service would inflate their marketplace ranking
        if (offer.ExpertUserId == requesterUserId)
        {
            throw WorkflowErrors.SelfReview();
        }
        var reviewCase = new ReviewCase
        {
            RequesterUserId = requesterUserId,
            RequesterEmail = requesterEmail,
            DocumentId = documentId,
            SourceVersionId = sourceVersionId,
            ExpertProfileId = offer.ExpertProfileId,
            ExpertUserId = offer.ExpertUserId,
            ServiceOfferingId = offer.ServiceOfferingId,
            ServiceCode = offer.ServiceCode,
            Fee = offer.Fee,
            PlatformFeePct = offer.PlatformFeePct,
            TurnaroundHours = offer.TurnaroundHours,
            LatePenaltyHours = offer.LatePenaltyHours,
            LatePenaltyPct = offer.LatePenaltyPct,
            LateCancelHours = offer.LateCancelHours,
            NoResponseHours = offer.NoResponseHours,
            NoResponseRefundPct = offer.NoResponseRefundPct,
            NoResponseExpertPct = offer.NoResponseExpertPct,
            ProblemDescription = RequiredText(problemDescription, "Problem description"),
            ExpectedOutcome = OptionalText(expectedOutcome, "Expected outcome"),
            PaymentDeadline = now + PaymentWindow,
            // The column is NOT NULL: latest possible deadline until payment sets the real one
            ResponseDeadline = now + PaymentWindow + ResponseWindow,
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

    /// <summary>The client sees the case from the request; the expert only once it is paid.</summary>
    public void EnsureVisibleTo(Guid userId)
    {
        var visible =
            userId == RequesterUserId
            || (userId == ExpertUserId && !UnpaidStatuses.Contains(Status));
        if (!visible)
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

    /// <summary>The chat role of a party to this case; anyone else is told the case does not exist.</summary>
    public string ParticipantRoleOf(Guid userId)
    {
        if (userId == RequesterUserId)
        {
            return CaseParticipant.Client;
        }
        if (userId == ExpertUserId)
        {
            return CaseParticipant.Expert;
        }
        throw WorkflowErrors.ReviewCaseNotFound();
    }

    /// <summary>
    /// New messages are accepted from the expert's acceptance until the case ends, so an unpaid booking
    /// cannot be used for free questions.
    /// </summary>
    public void EnsureChatOpen()
    {
        if (
            Status
            is not (
                ReviewCaseStatus.InReview
                or ReviewCaseStatus.AwaitingUserInformation
                or ReviewCaseStatus.AwaitingAcceptance
            )
        )
        {
            throw WorkflowErrors.ChatClosed(Status);
        }
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
