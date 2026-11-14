using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Caps.Common.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Domain.Workspace;

/// <summary>One version of a document; versions sent to review become immutable.</summary>
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

    public const string ExpertReviewed = "EXPERT_REVIEWED";

    /// <summary>Locks the version sent for review; the first case that took it keeps its id.</summary>
    public void LockForReview(Guid reviewCaseId)
    {
        IsImmutable = true;
        ReviewCaseId ??= reviewCaseId;
    }

    /// <summary>The expert's result as a new version of the client's document; the client's version is untouched.</summary>
    public static DocumentVersion ExpertReview(
        ReviewCase reviewCase,
        int versionNo,
        DateTimeOffset now
    )
    {
        var content = JsonSerializer.Serialize(
            new
            {
                result = reviewCase.Result,
                summary = reviewCase.ReviewSummary,
                cannotVerifyReason = reviewCase.CannotVerifyReason,
                sourceVersionId = reviewCase.SourceVersionId,
            }
        );
        return new DocumentVersion
        {
            DocumentId = reviewCase.DocumentId,
            VersionNo = versionNo,
            VersionType = ExpertReviewed,
            ReviewCaseId = reviewCase.Id,
            Content = content,
            // ponytail: hash of the text as written, jsonb reformats it, canonicalize if the hash must be re-checked
            ContentHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(content))),
            IsImmutable = true,
            CreatedBy = reviewCase.ExpertUserId,
            CreatedAt = now,
        };
    }
}
