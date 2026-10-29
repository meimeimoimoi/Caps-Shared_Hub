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

    /// <summary>Longest late window an admin may set, the same cap as a turnaround.</summary>
    public const int MaxLateHours = 720;
    public int Percent { get; private set; }

    /// <summary>Up to this many hours late, the client gets LatePenaltyPercent of the fee back from the expert's share.</summary>
    public int LatePenaltyHours { get; private set; }
    public int LatePenaltyPercent { get; private set; }

    /// <summary>Later than LatePenaltyHours the client gets the whole fee back; past this the case is cancelled.</summary>
    public int LateCancelHours { get; private set; }

    /// <summary>
    /// The client did not answer the expert's question within this many hours: the case ends and the fee splits
    /// into NoResponseRefundPercent for the client, NoResponseExpertPercent for the expert and the rest for the platform.
    /// </summary>
    public int NoResponseHours { get; private set; }
    public int NoResponseRefundPercent { get; private set; }
    public int NoResponseExpertPercent { get; private set; }

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
        int latePenaltyHours,
        int latePenaltyPercent,
        int lateCancelHours,
        int noResponseHours,
        int noResponseRefundPercent,
        int noResponseExpertPercent,
        DateOnly? effectiveOn,
        bool hasCurrentRate,
        int noticeDays,
        Guid adminId,
        DateTimeOffset now
    )
    {
        if (percent is < 0 or > MaxPercent)
            throw ExpertErrors.PlatformFeeInvalid(MaxPercent);
        // The penalty comes out of the expert's share, so it can never exceed what is left after the platform fee
        if (
            latePenaltyHours < 0
            || latePenaltyPercent < 0
            || percent + latePenaltyPercent > 100
            || lateCancelHours < latePenaltyHours
            || lateCancelHours > MaxLateHours
        )
        {
            throw ExpertErrors.LateRuleInvalid(MaxLateHours);
        }
        // Admins set the client's and the expert's shares; the platform keeps the rest, so the parts always add up
        if (
            noResponseHours is < 1 or > MaxLateHours
            || noResponseRefundPercent < 0
            || noResponseExpertPercent < 0
            || noResponseRefundPercent + noResponseExpertPercent > 100
        )
        {
            throw ExpertErrors.NoResponseRuleInvalid(MaxLateHours);
        }
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
            LatePenaltyHours = latePenaltyHours,
            LatePenaltyPercent = latePenaltyPercent,
            LateCancelHours = lateCancelHours,
            NoResponseHours = noResponseHours,
            NoResponseRefundPercent = noResponseRefundPercent,
            NoResponseExpertPercent = noResponseExpertPercent,
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
