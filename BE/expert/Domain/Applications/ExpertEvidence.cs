using Caps.Common.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Domain.Applications;

/// <summary>Metadata of an uploaded evidence file or a professional link; file bytes live in object storage under its FileUrl.</summary>
public sealed class ExpertEvidence
{
    private ExpertEvidence() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public Guid ApplicationId { get; private set; }
    public ExpertApplication Application { get; } = default!;

    /// <summary>Set for files added to a Gate 2 qualification; null for Gate 1 application files.</summary>
    public Guid? QualificationId { get; private set; }

    /// <summary>Document group code: CV or EV-01…EV-05 (POL-EXP-01), or SUPPLEMENT.</summary>
    public string EvidenceType { get; private set; } = default!;

    /// <summary>Object key in private storage, not a public URL. Empty string for link-only evidence.</summary>
    public string FileUrl { get; private set; } = default!;
    public string FileName { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public long SizeBytes { get; private set; }
    public string? ParsedMeta { get; private set; }
    public string? ScreeningFlag { get; }

    /// <summary>Optional criterion group assigned to a SUPPLEMENT file (CV or EV-01…EV-05).</summary>
    public string? AssignedGroup { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>External URL (LinkedIn, website) supplied by the applicant; null for file-only evidence.</summary>
    public string? SourceUrl { get; private set; }

    /// <summary>Content extraction status: PENDING, PROCESSING, EXTRACTED, UNREADABLE or FAILED; null for links, Gate 2 files and EV-01.</summary>
    public string? ExtractionStatus { get; private set; }

    /// <summary>When the file or link content was extracted or checked.</summary>
    public DateTimeOffset? ExtractedAt { get; private set; }

    /// <summary>Whether this evidence is a link rather than an uploaded file.</summary>
    public bool IsLink => SourceUrl != null;

    /// <summary>
    /// True for Gate 1 uploaded files outside EV-01 (identity documents are never read by AI).
    /// </summary>
    public bool RequiresAiExtraction =>
        !IsLink && QualificationId == null && EvidenceType != EligibilityCriteria.LegalEligibility;

    /// <summary>Records a file uploaded to the application; its storage path is derived from the ids.</summary>
    /// <param name="contentType">Detected from the file bytes (see ApplicationRules.ValidateFile).</param>
    public static ExpertEvidence Create(
        ExpertApplication application,
        Guid userId,
        string code,
        string fileName,
        string contentType,
        long sizeBytes,
        DateTimeOffset now
    )
    {
        var evidence = new ExpertEvidence
        {
            ExpertProfileId = application.ExpertProfileId,
            ApplicationId = application.Id,
            EvidenceType = code,
            FileName = SafeName(fileName),
            ContentType = contentType,
            SizeBytes = sizeBytes,
            CreatedAt = now,
        };
        evidence.FileUrl = $"experts/{userId}/{application.Id}/{evidence.Id}";
        evidence.PrepareExtraction();
        return evidence;
    }

    /// <summary>Records a professional link (LinkedIn, website) added to the application.</summary>
    public static ExpertEvidence CreateFromUrl(
        ExpertApplication application,
        Guid userId,
        string code,
        string sourceUrl,
        DateTimeOffset now
    )
    {
        if (
            code != ApplicationRules.SupplementCode
            && !ApplicationRules.EvidenceCodes.Contains(code)
        )
        {
            throw ExpertErrors.InvalidEvidenceCode();
        }
        var url = ApplicationRules.ValidateUrl(sourceUrl);
        return new ExpertEvidence
        {
            ExpertProfileId = application.ExpertProfileId,
            ApplicationId = application.Id,
            EvidenceType = code,
            SourceUrl = url,
            FileUrl = "",
            FileName = "",
            ContentType = "text/uri-list",
            SizeBytes = 0,
            CreatedAt = now,
        };
    }

    /// <summary>
    /// Records a link added to a Gate 2 qualification. Reviewers open it directly; nothing is downloaded or
    /// extracted (I3).
    /// </summary>
    public static ExpertEvidence CreateLinkForQualification(
        ExpertServiceQualification qualification,
        string sourceUrl,
        DateTimeOffset now
    ) =>
        new()
        {
            ExpertProfileId = qualification.ExpertProfileId,
            ApplicationId = qualification.ApplicationId,
            QualificationId = qualification.Id,
            EvidenceType = ApplicationRules.CompetencyCode,
            SourceUrl = ApplicationRules.ValidateUrl(sourceUrl),
            FileUrl = "",
            FileName = "",
            ContentType = "text/uri-list",
            SizeBytes = 0,
            CreatedAt = now,
        };

    /// <summary>
    /// Records a file added to a Gate 2 qualification. It stays linked to the Gate 1 application the
    /// qualification relies on, but only the qualification lists it.
    /// </summary>
    /// <param name="contentType">Detected from the file bytes (see ApplicationRules.ValidateContent).</param>
    public static ExpertEvidence CreateForQualification(
        ExpertServiceQualification qualification,
        Guid userId,
        string fileName,
        string contentType,
        long sizeBytes,
        DateTimeOffset now
    )
    {
        var evidence = new ExpertEvidence
        {
            ExpertProfileId = qualification.ExpertProfileId,
            ApplicationId = qualification.ApplicationId,
            QualificationId = qualification.Id,
            EvidenceType = ApplicationRules.CompetencyCode,
            FileName = SafeName(fileName),
            ContentType = contentType,
            SizeBytes = sizeBytes,
            CreatedAt = now,
        };
        evidence.FileUrl = $"experts/{userId}/qualifications/{qualification.Id}/{evidence.Id}";
        return evidence;
    }

    /// <summary>Marks an eligible Gate 1 file as waiting for one-time AI extraction.</summary>
    public void PrepareExtraction()
    {
        if (RequiresAiExtraction && ExtractionStatus == null)
            ExtractionStatus = ExtractionStatuses.Pending;
    }

    /// <summary>Re-queues extraction when retrying a failed or previously disabled run.</summary>
    public void QueueExtractionRetry()
    {
        if (RequiresAiExtraction)
            ExtractionStatus = ExtractionStatuses.Pending;
    }

    /// <summary>Marks extraction as actively in flight so duplicate workers do not process the same file.</summary>
    public void MarkExtractionProcessing(DateTimeOffset now)
    {
        ExtractionStatus = ExtractionStatuses.Processing;
        ExtractedAt = now;
    }

    /// <summary>Updates the extraction result after background processing.</summary>
    public void MarkExtracted(string parsedMeta, DateTimeOffset now)
    {
        ExtractionStatus = ExtractionStatuses.Extracted;
        ParsedMeta = parsedMeta;
        ExtractedAt = now;
    }

    /// <summary>Marks the file as unreadable or skipped because image reading is disabled.</summary>
    public void MarkUnreadable(string parsedMeta, DateTimeOffset now)
    {
        ExtractionStatus = ExtractionStatuses.Unreadable;
        ParsedMeta = parsedMeta;
        ExtractedAt = now;
    }

    /// <summary>Marks extraction as failed when the AI service or storage call failed transiently.</summary>
    public void MarkExtractionFailed()
    {
        ExtractionStatus = ExtractionStatuses.Failed;
    }

    /// <summary>Assigns a SUPPLEMENT file to a target evidence group (or clears it with null).</summary>
    public void AssignGroup(string? group)
    {
        if (EvidenceType != ApplicationRules.SupplementCode)
            throw ExpertErrors.EvidenceGroupAssignNotAllowed();
        if (group == null)
        {
            AssignedGroup = null;
            return;
        }
        var normalized = group.Trim().ToUpperInvariant();
        if (!ApplicationRules.EvidenceCodes.Contains(normalized))
            throw ExpertErrors.InvalidEvidenceCode();
        AssignedGroup = normalized;
    }

    /// <summary>Keeps only the file name part (no client path) and caps its length.</summary>
    private static string SafeName(string fileName) =>
        Path.GetFileName(fileName).Trim() is { Length: > 0 } name
            ? name[..Math.Min(name.Length, 255)]
            : "file";
}

/// <summary>Constants for the extraction_status column.</summary>
public static class ExtractionStatuses
{
    public const string Pending = "PENDING";
    public const string Processing = "PROCESSING";
    public const string Extracted = "EXTRACTED";
    public const string Unreadable = "UNREADABLE";
    public const string Failed = "FAILED";
}
