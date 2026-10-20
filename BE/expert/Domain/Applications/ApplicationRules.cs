using Caps.Common.Domain;

namespace Caps.Expert.Domain.Applications;

/// <summary>Data rules for expert applications (BR-E02, POL-EXP-01).</summary>
public static class ApplicationRules
{
    /// <summary>Documents attached when supplementing (NEED_MORE_INFORMATION); not part of a fixed group.</summary>
    public const string SupplementCode = "SUPPLEMENT";

    public const string CvCode = "CV";

    /// <summary>Files added to a Gate 2 qualification while the reviewer asks for more evidence.</summary>
    public const string CompetencyCode = "COMPETENCY";

    /// <summary>Required CV + 5 eligibility evidence groups EV-01…EV-05 (EV-06 is years of experience).</summary>
    public static readonly string[] EvidenceCodes =
    [
        CvCode,
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

    /// <summary>
    /// Max files before the email is verified: enough to start the draft (CV and a few documents) while an
    /// account that is never verified cannot fill the storage.
    /// </summary>
    public const int MaxFilesBeforeVerification = 3;

    /// <summary>Checks that one more file fits, given how many the application already holds.</summary>
    public static void EnsureRoomForFile(int currentCount, bool emailVerified)
    {
        if (currentCount >= MaxFilesPerApplication)
            throw ExpertErrors.EvidenceLimit(MaxFilesPerApplication);
        if (!emailVerified && currentCount >= MaxFilesBeforeVerification)
            throw ExpertErrors.EvidenceLimitUnverified(MaxFilesBeforeVerification);
    }

    /// <summary>Validates an uploaded file; returns the content type detected from its bytes.</summary>
    public static string ValidateFile(string code, byte[] content)
    {
        if (code != SupplementCode && !EvidenceCodes.Contains(code))
            throw ExpertErrors.InvalidEvidenceCode();
        return ValidateContent(content);
    }

    /// <summary>Validates the bytes of an upload; returns the content type detected from them.</summary>
    public static string ValidateContent(byte[] content)
    {
        if (content.Length == 0)
            throw ExpertErrors.EvidenceRequired();
        if (content.Length > MaxFileBytes)
            throw ExpertErrors.EvidenceTooLarge();
        var type = FileSignature.Detect(content);
        return type is FileSignature.Pdf or FileSignature.Jpeg or FileSignature.Png
            ? type
            : throw ExpertErrors.EvidenceInvalidType();
    }

    /// <summary>Unique, trimmed field codes; unknown codes are rejected.</summary>
    public static string[] NormalizeFields(IEnumerable<string>? fields)
    {
        var normalized = (fields ?? []).Select(x => x.Trim()).Distinct().ToArray();
        var unknown = normalized.Except(FieldCodes).FirstOrDefault();
        return unknown == null ? normalized : throw ExpertErrors.InvalidField(unknown);
    }

    public static void ValidateBirthDate(DateOnly? birthDate, DateTimeOffset now)
    {
        if (
            birthDate is { } birth
            && (birth > DateOnly.FromDateTime(now.UtcDateTime) || birth.Year < 1900)
        )
        {
            throw ExpertErrors.InvalidBirthDate();
        }
    }
}
