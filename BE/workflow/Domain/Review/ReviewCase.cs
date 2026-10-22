using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>An expert review of one document version, from request through payment and delivery to acceptance.</summary>
public sealed class ReviewCase
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid DocumentId { get; set; }
    public Guid SourceVersionId { get; set; }
    public Guid RequesterUserId { get; set; }
    public Guid ExpertProfileId { get; set; }

    // Tokens carry user ids only and the expert schema is off limits, so the expert's user id is copied here
    public Guid ExpertUserId { get; set; }
    public Guid? SlotId { get; set; }
    public Guid? ServiceOfferingId { get; set; }
    public long Fee { get; set; }
    public short PlatformFeePct { get; set; }
    public string ProblemDescription { get; set; } = default!;
    public string? ExpectedOutcome { get; set; }
    public string Status { get; set; } = "PENDING_EXPERT_RESPONSE";
    public string? Result { get; set; }
    public string? CannotVerifyReason { get; set; }
    public string? ReviewSummary { get; set; }
    public string? DeclineReason { get; set; }
    public string? TerminationReason { get; set; }
    public DateTimeOffset ResponseDeadline { get; set; }
    public DateTimeOffset? AcceptedAt { get; set; }
    public DateTimeOffset? PaymentDeadline { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public DateTimeOffset? StartDeadline { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? DeliveryDeadline { get; set; }
    public DateTimeOffset? DeliveredAt { get; set; }
    public DateTimeOffset? AcceptanceDeadline { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ReviewTask> ReviewTasks { get; set; } = [];
    public ICollection<InfoRequest> InfoRequests { get; set; } = [];
    public ICollection<ReviewAttachment> Attachments { get; set; } = [];
    public ICollection<ReviewStatusHistory> StatusHistories { get; set; } = [];

    private static readonly string[] ClosedStatuses =
    [
        "COMPLETED",
        "TERMINATED",
        "EXPERT_DECLINED",
        "REQUEST_EXPIRED",
    ];

    /// <summary>The chat role of a party to this case; anyone else is told the case does not exist.</summary>
    public string ParticipantRoleOf(Guid userId)
    {
        if (userId == RequesterUserId)
            return CaseParticipant.Client;
        if (userId == ExpertUserId)
            return CaseParticipant.Expert;
        throw WorkflowErrors.ReviewCaseNotFound();
    }

    /// <summary>New messages are only accepted until the case ends.</summary>
    public void EnsureChatOpen()
    {
        if (ClosedStatuses.Contains(Status))
            throw WorkflowErrors.ChatClosed(Status);
    }
}
