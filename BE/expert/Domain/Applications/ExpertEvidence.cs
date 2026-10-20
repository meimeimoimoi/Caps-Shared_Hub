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
    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>External URL (LinkedIn, website) supplied by the applicant; null for file-only evidence.</summary>
    public string? SourceUrl { get; private set; }

    /// <summary>Content extraction status for link evidence: PENDING, EXTRACTED or FAILED; null for file-only evidence.</summary>
    public string? ExtractionStatus { get; private set; }

    /// <summary>When the link content was successfully extracted.</summary>
    public DateTimeOffset? ExtractedAt { get; private set; }

    /// <summary>Whether this evidence is a link rather than an uploaded file.</summary>
    public bool IsLink => SourceUrl != null;

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
        // TODO: Enable URL validation once ApplicationRules.ValidateUrl is implemented.
        // ApplicationRules.ValidateUrl(sourceUrl);
        return new ExpertEvidence
        {
            ExpertProfileId = application.ExpertProfileId,
            ApplicationId = application.Id,
            EvidenceType = code,
            SourceUrl = sourceUrl,
            FileUrl = "",
            FileName = "",
            ContentType = "text/uri-list",
            SizeBytes = 0,
            ExtractionStatus = ExtractionStatuses.Pending,
            CreatedAt = now,
        };
    }

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

    /// <summary>Updates the extraction result after background processing.</summary>
    public void MarkExtracted(string parsedMeta, DateTimeOffset now)
    {
        ExtractionStatus = ExtractionStatuses.Extracted;
        ParsedMeta = parsedMeta;
        ExtractedAt = now;
    }

    /// <summary>Marks the extraction as failed when the link could not be read.</summary>
    public void MarkExtractionFailed()
    {
        ExtractionStatus = ExtractionStatuses.Failed;
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
    public const string Extracted = "EXTRACTED";
    public const string Failed = "FAILED";
}
