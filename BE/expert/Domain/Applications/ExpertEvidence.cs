using Caps.Common.Domain;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Domain.Applications;

/// <summary>Metadata of an uploaded evidence file; the bytes live in object storage under its FileUrl.</summary>
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

    /// <summary>Object key in private storage, not a public URL.</summary>
    public string FileUrl { get; private set; } = default!;
    public string FileName { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public long SizeBytes { get; private set; }
    public string? ParsedMeta { get; }
    public string? ScreeningFlag { get; }
    public DateTimeOffset CreatedAt { get; private set; }

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

    /// <summary>Keeps only the file name part (no client path) and caps its length.</summary>
    private static string SafeName(string fileName) =>
        Path.GetFileName(fileName).Trim() is { Length: > 0 } name
            ? name[..Math.Min(name.Length, 255)]
            : "file";
}
