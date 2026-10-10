using Caps.Common.Database;

namespace workflow.Entities.Review;

public sealed class ReviewTask
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; set; }
    public ReviewCase ReviewCase { get; set; } = default!;

    public string TaskCode { get; set; } = default!;
    public string Status { get; set; } = "PENDING";
    public string? Note { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
