using Caps.Common.Domain;

namespace Caps.Workflow.Domain.Workspace;

/// <summary>A user's document (e.g. a tax explanation) for a period, built from a template or uploaded.</summary>
public sealed class Document
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid OwnerUserId { get; set; }
    public string Source { get; set; } = "TEMPLATE";
    public Guid? TemplateId { get; set; }
    public Template? Template { get; set; }
    public string Title { get; set; } = default!;
    public DateOnly PeriodStart { get; set; }
    public DateOnly PeriodEnd { get; set; }
    public string Status { get; set; } = "DRAFT";
    public Guid? VerifiedVersionId { get; set; }
    public string Metadata { get; set; } = "{}"; // jsonb
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<InputSnapshot> InputSnapshots { get; set; } = [];
    public ICollection<DocumentVersion> Versions { get; set; } = [];
}
