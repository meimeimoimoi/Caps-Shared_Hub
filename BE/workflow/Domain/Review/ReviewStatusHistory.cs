using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>Audit trail of a review case's status changes.</summary>
public sealed class ReviewStatusHistory
{
    private ReviewStatusHistory() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; private set; }
    public ReviewCase ReviewCase { get; } = default!;

    public string? FromStatus { get; private set; }
    public string ToStatus { get; private set; } = default!;

    /// <summary>Null when the system (a cron or a payment callback) made the change.</summary>
    public Guid? ActorUserId { get; private set; }
    public string? Note { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static ReviewStatusHistory Record(
        Guid reviewCaseId,
        string? fromStatus,
        string toStatus,
        Guid? actorUserId,
        string? note,
        DateTimeOffset now
    ) =>
        new()
        {
            ReviewCaseId = reviewCaseId,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            ActorUserId = actorUserId,
            Note = note,
            CreatedAt = now,
        };
}
