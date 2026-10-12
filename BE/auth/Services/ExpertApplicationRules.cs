namespace auth.Services;

/// <summary>Data rules for expert applications (BR-E02, POL-EXP-01).</summary>
public static class ExpertApplicationRules
{
    /// <summary>Documents attached when supplementing (NEED_MORE_INFORMATION); not part of a fixed group.</summary>
    public const string SupplementCode = "SUPPLEMENT";

    /// <summary>Required CV + 5 eligibility evidence groups EV-01…EV-05 (EV-06 is years of experience).</summary>
    public static readonly string[] EvidenceCodes =
    [
        "CV",
        "EV-01",
        "EV-02",
        "EV-03",
        "EV-04",
        "EV-05",
    ];

    public static readonly string[] FieldCodes =
    [
        "CORPORATE_INCOME_TAX",
        "TAX_FINALIZATION",
        "CORPORATE_ACCOUNTING",
        "FINANCIAL_REPORTING",
        "AUDIT",
        "TAX_ADVISORY",
    ];

    public const long MaxFileBytes = 10 * 1024 * 1024;

    /// <summary>Max files per application: unverified accounts can upload too, so abuse must be capped.</summary>
    public const int MaxFilesPerApplication = 20;

    /// <summary>Detect the file type from its content (never trust the extension or the client's Content-Type).</summary>
    public static string? DetectContentType(ReadOnlySpan<byte> d)
    {
        if (d.Length >= 5 && d[..5].SequenceEqual("%PDF-"u8))
            return "application/pdf";
        if (d.Length >= 3 && d[0] == 0xFF && d[1] == 0xD8 && d[2] == 0xFF)
            return "image/jpeg";
        if (
            d.Length >= 8
            && d[..8].SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A })
        )
            return "image/png";
        return null;
    }

    /// <summary>Closed application: applying again requires a new Application (BR-E23).</summary>
    public static bool IsClosed(string status) =>
        status
            is Entities.ExpertApplicationStatus.NotEligible
                or Entities.ExpertApplicationStatus.Rejected
                or Entities.ExpertApplicationStatus.Approved;
}
