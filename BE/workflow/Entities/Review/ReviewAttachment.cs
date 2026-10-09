using Caps.Common.Database;

namespace workflow.Entities.Review;

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
