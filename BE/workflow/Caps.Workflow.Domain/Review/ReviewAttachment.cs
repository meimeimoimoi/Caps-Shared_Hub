using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Review;

/// <summary>A file added to a review case, optionally as the answer to an information request.</summary>
public sealed class ReviewAttachment
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; set; }
    public ReviewCase ReviewCase { get; set; } = default!;

    public Guid? InfoRequestId { get; set; }
    public InfoRequest? InfoRequest { get; set; }
    public string FileUrl { get; set; } = default!;
    public string FileName { get; set; } = default!;
    public Guid UploadedBy { get; set; }
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
}
