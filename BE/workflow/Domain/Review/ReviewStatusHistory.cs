using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>Audit trail of a review case's status changes.</summary>
public sealed class ReviewStatusHistory
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; set; }
    public ReviewCase ReviewCase { get; set; } = default!;

    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = default!;
    public Guid? ActorUserId { get; set; }
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
