using Caps.Common.Domain;

namespace Caps.Expert.Domain.Applications;

public sealed class ExpertEvidence
{
    private ExpertEvidence() { }

    public Guid Id { get; private set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; private set; }
    public Guid ApplicationId { get; private set; }
    public ExpertApplication Application { get; private set; } = default!;

    /// <summary>Document group code: CV or EV-01…EV-05 (POL-EXP-01), or SUPPLEMENT.</summary>
    public string EvidenceType { get; private set; } = default!;

    /// <summary>Object key in private storage, not a public URL.</summary>
    public string FileUrl { get; private set; } = default!;
    public string FileName { get; private set; } = default!;
    public string ContentType { get; private set; } = default!;
    public long SizeBytes { get; private set; }
    public string? ParsedMeta { get; private set; }
    public string? ScreeningFlag { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

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

    /// <summary>Keeps only the file name part (no client path) and caps its length.</summary>
    private static string SafeName(string fileName) =>
        Path.GetFileName(fileName).Trim() is { Length: > 0 } name
            ? name[..Math.Min(name.Length, 255)]
            : "file";
}
