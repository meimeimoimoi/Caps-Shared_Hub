using System.Net;
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
        EligibilityCriteria.LegalEligibility,
        EligibilityCriteria.ProfessionalQualification,
        EligibilityCriteria.ContinuingEducation,
        EligibilityCriteria.ProfessionalEthics,
        EligibilityCriteria.Confidentiality,
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

    /// <summary>Accepts absolute HTTP(S) links to public hosts, without embedded credentials.</summary>
    public static string ValidateUrl(string? sourceUrl)
    {
        var value = sourceUrl?.Trim();
        if (
            string.IsNullOrEmpty(value)
            || value.Length > 2048
            || value.Any(char.IsControl)
            || !Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp)
            || uri.UserInfo.Length != 0
            || !IsPublicHost(uri)
        )
        {
            throw ExpertErrors.EvidenceInvalidUrl();
        }
        return uri.AbsoluteUri;
    }

    private static bool IsPublicHost(Uri uri)
    {
        var host = uri.IdnHost.TrimEnd('.');
        if (IPAddress.TryParse(host, out var address))
        {
            if (address.IsIPv4MappedToIPv6)
                address = address.MapToIPv4();
            var bytes = address.GetAddressBytes();
            if (bytes.Length == 16)
                return (bytes[0] & 0xe0) == 0x20;
            return bytes[0] != 0
                && bytes[0] != 10
                && bytes[0] != 127
                && !(bytes[0] == 100 && bytes[1] is >= 64 and <= 127)
                && !(bytes[0] == 169 && bytes[1] == 254)
                && !(bytes[0] == 172 && bytes[1] is >= 16 and <= 31)
                && !(bytes[0] == 192 && bytes[1] == 168)
                && bytes[0] < 224;
        }
        return uri.HostNameType == UriHostNameType.Dns
            && host.Contains('.')
            && !host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase)
            && !host.EndsWith(".local", StringComparison.OrdinalIgnoreCase)
            && !host.EndsWith(".internal", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Max files per application, so one application cannot fill the storage.</summary>
    public const int MaxFilesPerApplication = 20;

    /// <summary>Checks that one more file fits, given how many the application already holds.</summary>
    public static void EnsureRoomForFile(int currentCount)
    {
        if (currentCount >= MaxFilesPerApplication)
            throw ExpertErrors.EvidenceLimit(MaxFilesPerApplication);
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
