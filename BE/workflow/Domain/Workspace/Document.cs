using System.Security.Cryptography;
using System.Text.Json;
using Caps.Common.Domain;
using Caps.Workflow.Domain.Review;

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

    public const string ExternalFile = "EXTERNAL_FILE";
    public const string Draft = "DRAFT";
    public const string InReview = "IN_REVIEW";
    public const string Verified = "VERIFIED";

    /// <summary>
    /// A document the client brings as a file: version 1 holds it. The file is checked by its bytes (same rules as
    /// review case attachments) and stays editable until a paid review case locks it.
    /// </summary>
    public static Document Upload(
        Guid ownerUserId,
        string title,
        DateOnly periodStart,
        DateOnly periodEnd,
        string? fileName,
        byte[] content,
        DateTimeOffset now
    )
    {
        if (periodEnd < periodStart)
        {
            throw Exceptions.WorkflowErrors.DocumentInvalidPeriod();
        }
        // ponytail: reuses the attachment checks and error codes (ATTACHMENT_*); give document their own if the FE needs to tell them apart
        var contentType = ReviewAttachment.DetectType(content);
        var name = ReviewAttachment.NameOf(fileName);
        var document = new Document
        {
            OwnerUserId = ownerUserId,
            Source = ExternalFile,
            Title = title,
            PeriodStart = periodStart,
            PeriodEnd = periodEnd,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var version = new DocumentVersion
        {
            DocumentId = document.Id,
            VersionNo = 1,
            VersionType = ExternalFile,
            Content = JsonSerializer.Serialize(
                new
                {
                    fileName = name,
                    contentType,
                    sizeBytes = content.Length,
                }
            ),
            ContentHash = Convert.ToHexStringLower(SHA256.HashData(content)),
            CreatedBy = ownerUserId,
            CreatedAt = now,
        };
        version.FileUrl = $"documents/{document.Id}/{version.Id}";
        document.Versions.Add(version);
        return document;
    }

    /// <summary>
    /// Follows the document's review cases: IN_REVIEW while a paid case runs, otherwise VERIFIED when this case
    /// verified it or the verified version is still the latest, otherwise DRAFT.
    /// </summary>
    public void SyncReview(
        bool paidCaseOpen,
        Guid? verifiedVersionId,
        bool verifiedIsLatest,
        DateTimeOffset now
    )
    {
        if (verifiedVersionId is { } id)
        {
            VerifiedVersionId = id;
        }
        Status =
            paidCaseOpen ? InReview
            : verifiedVersionId is not null || verifiedIsLatest ? Verified
            : Draft;
        UpdatedAt = now;
    }

    /// <summary>A client version added after verification starts a new draft; the verified version stays recorded.</summary>
    public void StartNewDraft(DateTimeOffset now)
    {
        if (Status != Verified)
        {
            return;
        }
        Status = Draft;
        UpdatedAt = now;
    }
}
