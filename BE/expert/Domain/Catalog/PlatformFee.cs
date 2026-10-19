using System.Text.RegularExpressions;
using Caps.Common.Domain;

namespace Caps.Expert.Domain.Catalog;

/// <summary>
/// The platform's share of one service, set by an administrator. Rows are never edited: a new rate is a new
/// row, so history stays and cases keep the percent they were booked with (frozen on the review case).
/// </summary>
public sealed partial class PlatformFee
{
    /// <summary>The expert always keeps part of the fee.</summary>
    public const int MaxPercent = 99;

    private PlatformFee() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public string ServiceType { get; private set; } = default!;

    public int Percent { get; private set; }
    public DateTimeOffset EffectiveFrom { get; private set; }

    /// <summary>Administrator account that set this rate.</summary>
    public Guid SetBy { get; private set; }

    /// <summary>A new rate for the service, effective now; setting the first rate opens the service for pricing.</summary>
    public static PlatformFee Set(string serviceType, int percent, Guid adminId, DateTimeOffset now)
    {
        if (percent is < 0 or > MaxPercent)
        {
            throw ExpertErrors.PlatformFeeInvalid(MaxPercent);
        }
        return new()
        {
            ServiceType = NormalizeServiceType(serviceType),
            Percent = percent,
            EffectiveFrom = now,
            SetBy = adminId,
        };
    }

    /// <summary>What the expert receives from a fee, rounded down to the dong.</summary>
    public long NetOf(long fee) => fee * (100 - Percent) / 100;

    /// <summary>Trims and lowercases a service code (e.g. " CIT-Review " → "cit-review"), rejecting bad formats.</summary>
    public static string NormalizeServiceType(string? serviceType)
    {
        var code = serviceType?.Trim().ToLowerInvariant() ?? "";
        return code.Length <= 50 && ServiceCode().IsMatch(code)
            ? code
            : throw ExpertErrors.ServiceTypeInvalid();
    }

    [GeneratedRegex("^[a-z0-9]+(-[a-z0-9]+)*$")]
    private static partial Regex ServiceCode();
}
