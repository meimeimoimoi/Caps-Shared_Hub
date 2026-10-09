using Caps.Common.Database;

namespace workflow.Entities.Workspace;

public sealed class TemplateVersion
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid TemplateId { get; set; }
    public Template Template { get; set; } = default!;

    public int VersionNo { get; set; }
    public string FieldSchema { get; set; } = default!; // jsonb
    public string Status { get; set; } = "DRAFT";
    public Guid CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
