using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>A question the expert asks the requester during a review, answered before a deadline.</summary>
public sealed class InfoRequest
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; set; }
    public ReviewCase ReviewCase { get; set; } = default!;

    public Guid RequestedBy { get; set; }
    public string Message { get; set; } = default!;
    public DateTimeOffset DueAt { get; set; }
    public string? ResponseMessage { get; set; }
    public DateTimeOffset? RespondedAt { get; set; }
    public string Status { get; set; } = "OPEN";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ReviewAttachment> Attachments { get; set; } = new List<ReviewAttachment>();
}
