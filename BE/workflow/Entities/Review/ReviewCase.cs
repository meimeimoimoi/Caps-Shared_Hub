using Caps.Common.Database;

namespace workflow.Entities.Review;

public sealed class ReviewCase
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid DocumentId { get; set; }
    public Guid SourceVersionId { get; set; }
    public Guid RequesterUserId { get; set; }
    public Guid ExpertProfileId { get; set; }
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

    public ICollection<ReviewTask> ReviewTasks { get; set; } = new List<ReviewTask>();
    public ICollection<InfoRequest> InfoRequests { get; set; } = new List<InfoRequest>();
    public ICollection<ReviewAttachment> Attachments { get; set; } = new List<ReviewAttachment>();
    public ICollection<ReviewStatusHistory> StatusHistories { get; set; } = new List<ReviewStatusHistory>();
}
