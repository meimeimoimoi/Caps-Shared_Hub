using Caps.Common.Database;

namespace workflow.Entities.Workspace;

public sealed class InputSnapshot
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = default!;

    public int VersionNo { get; set; }
    public string Data { get; set; } = default!; // jsonb
    public Guid CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
