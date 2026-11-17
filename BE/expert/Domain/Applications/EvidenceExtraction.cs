namespace Caps.Expert.Domain.Applications;

/// <summary>Document classification values returned by the CV extraction model.</summary>
public static class ExtractedDocumentTypes
{
    public const string Cv = "CV";
    public const string TaxCertificate = "TAX_CERTIFICATE";
    public const string TrainingCertificate = "TRAINING_CERTIFICATE";
    public const string Other = "OTHER";
}

/// <summary>Outcomes reported by the CV extraction pipeline.</summary>
public static class ExtractionOutcomes
{
    public const string Extracted = "EXTRACTED";
    public const string Unreadable = "UNREADABLE";
    public const string VisionDisabled = "VISION_DISABLED";
    public const string Failed = "FAILED";
}

/// <summary>One work period extracted by AI from a CV or professional document.</summary>
public sealed record ExtractedWorkMilestone(
    string? Company,
    string? Role,
    int? StartYear,
    int? StartMonth,
    int? EndYear,
    int? EndMonth,
    bool IsCurrent,
    bool IsTaxAccounting
);

/// <summary>Certificate metadata extracted by AI from a CV or certificate document.</summary>
public sealed record ExtractedCertificate(
    string? Name,
    string? Issuer,
    DateOnly? IssuedDate,
    DateOnly? ExpiryDate
);

/// <summary>
/// Structured fields extracted once per evidence file (Section 1 of the CV screening spec).
/// Stored as JSON in <see cref="ExpertEvidence.ParsedMeta"/> without raw file text or conclusions.
/// </summary>
public sealed record EvidenceExtraction(
    string Status,
    bool IsImage,
    bool IsScanned,
    bool IsUnreadable,
    string? UnreadableReason,
    string? FullName,
    string? DocumentType,
    string[] FieldCodes,
    ExtractedWorkMilestone[] WorkMilestones,
    ExtractedCertificate[] Certificates
);
