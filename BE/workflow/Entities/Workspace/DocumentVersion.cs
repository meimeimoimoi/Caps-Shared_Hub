using Caps.Common.Database;

namespace workflow.Entities.Workspace;

public sealed class DocumentVersion
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid DocumentId { get; set; }
    public Document Document { get; set; } = default!;

    public int VersionNo { get; set; }
    public string VersionType { get; set; } = default!;
    public Guid? InputSnapshotId { get; set; }
    public InputSnapshot? InputSnapshot { get; set; }
    public Guid? TemplateVersionId { get; set; }
    public TemplateVersion? TemplateVersion { get; set; }
    public string? Citations { get; set; } // jsonb
    public string? DraftAssessment { get; set; }
    public Guid? ReviewCaseId { get; set; }
    public string? FileUrl { get; set; }
    public string Content { get; set; } = default!; // jsonb
    public string ContentHash { get; set; } = default!;
    public bool IsImmutable { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
