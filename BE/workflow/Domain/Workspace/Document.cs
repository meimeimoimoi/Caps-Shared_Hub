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

    public const string Draft = "DRAFT";
    public const string InReview = "IN_REVIEW";
    public const string Verified = "VERIFIED";

    /// <summary>
    /// Follows the document's review cases: IN_REVIEW while a paid case runs, otherwise VERIFIED once an expert
    /// verified a version (kept after later cases), otherwise DRAFT.
    /// </summary>
    public void SyncReview(bool paidCaseOpen, Guid? verifiedVersionId, DateTimeOffset now)
    {
        if (verifiedVersionId is { } id)
            VerifiedVersionId = id;
        Status =
            paidCaseOpen ? InReview
            : VerifiedVersionId is null ? Draft
            : Verified;
        UpdatedAt = now;
    }
}
