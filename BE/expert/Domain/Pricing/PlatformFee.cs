using Caps.Common.Domain;
using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Domain.Pricing;

/// <summary>
/// The platform's share of one catalog service, set by a System Admin. A new rate is a new row, so history stays
/// and cases keep the percent they were booked with (frozen on the review case). A change must be announced
/// FeeNoticeDays ahead, raise or cut alike; while it waits it is the one pending row of the service and may be
/// cancelled or replaced. Rows that took effect are never edited.
/// </summary>
public sealed class PlatformFee
{
    /// <summary>The expert always keeps at least half of the fee.</summary>
    public const int MaxPercent = 50;

    /// <summary>The platform operates in Vietnam time; a rate takes effect at the start of a local day.</summary>
    public static readonly TimeSpan LocalOffset = TimeSpan.FromHours(7);

    private PlatformFee() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public string ServiceCode { get; private set; } = default!;
    public int Percent { get; private set; }
    public DateTimeOffset EffectiveFrom { get; private set; }

    /// <summary>System Admin account that set this rate.</summary>
    public Guid SetBy { get; private set; }

    /// <summary>Set when a pending rate was cancelled or replaced before it took effect.</summary>
    public DateTimeOffset? CancelledAt { get; private set; }

    public Guid? CancelledBy { get; private set; }

    public bool IsPendingAt(DateTimeOffset now) => CancelledAt == null && EffectiveFrom > now;

    /// <summary>The first day a new rate may take effect: today in Vietnam time plus the notice days.</summary>
    public static DateOnly EarliestEffectiveOn(DateTimeOffset now, int noticeDays) =>
        DateOnly.FromDateTime(now.ToOffset(LocalOffset).Date).AddDays(noticeDays);

    /// <summary>
    /// A new rate for the service. The very first rate takes effect at once and opens the service for pricing;
    /// any later one starts on effectiveOn, which must be at least the notice days away.
    /// </summary>
    public static PlatformFee Set(
        ServiceCatalogItem service,
        int percent,
        DateOnly? effectiveOn,
        bool hasCurrentRate,
        int noticeDays,
        Guid adminId,
        DateTimeOffset now
    )
    {
        if (percent is < 0 or > MaxPercent)
            throw ExpertErrors.PlatformFeeInvalid(MaxPercent);
        DateTimeOffset effectiveFrom;
        if (!hasCurrentRate && effectiveOn == null)
        {
            effectiveFrom = now;
        }
        else
        {
            var earliest = EarliestEffectiveOn(now, noticeDays);
            if (effectiveOn == null || effectiveOn < earliest)
                throw ExpertErrors.PlatformFeeTooSoon(noticeDays, earliest);
            effectiveFrom = new DateTimeOffset(
                effectiveOn.Value.ToDateTime(TimeOnly.MinValue),
                LocalOffset
            );
        }
        return new()
        {
            ServiceCode = service.Code,
            Percent = percent,
            EffectiveFrom = effectiveFrom,
            SetBy = adminId,
        };
    }

    /// <summary>Withdraws a rate that has not taken effect yet; the row stays as history.</summary>
    public void Cancel(Guid adminId, DateTimeOffset now)
    {
        if (!IsPendingAt(now))
            throw ExpertErrors.PlatformFeeNotPending();
        CancelledAt = now;
        CancelledBy = adminId;
    }

    /// <summary>What the expert receives from a fee, rounded down to the dong.</summary>
    public long NetOf(long fee) => fee * (100 - Percent) / 100;
}
