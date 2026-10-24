using Caps.Common.Domain;
using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Domain.Pricing;

/// <summary>
/// The platform's share of one catalog service, set by a System Admin. Rows are never edited: a new rate is
/// a new row, so history stays and cases keep the percent they were booked with (frozen on the review case).
/// </summary>
public sealed class PlatformFee
{
    /// <summary>The expert always keeps part of the fee.</summary>
    public const int MaxPercent = 99;

    private PlatformFee() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public string ServiceCode { get; private set; } = default!;
    public int Percent { get; private set; }
    public DateTimeOffset EffectiveFrom { get; private set; }

    /// <summary>System Admin account that set this rate.</summary>
    public Guid SetBy { get; private set; }

    /// <summary>A new rate for the service, effective now; the first rate opens the service for pricing.</summary>
    public static PlatformFee Set(
        ServiceCatalogItem service,
        int percent,
        Guid adminId,
        DateTimeOffset now
    )
    {
        if (percent is < 0 or > MaxPercent)
            throw ExpertErrors.PlatformFeeInvalid(MaxPercent);
        return new()
        {
            ServiceCode = service.Code,
            Percent = percent,
            EffectiveFrom = now,
            SetBy = adminId,
        };
    }

    /// <summary>What the expert receives from a fee, rounded down to the dong.</summary>
    public long NetOf(long fee) => fee * (100 - Percent) / 100;
}
