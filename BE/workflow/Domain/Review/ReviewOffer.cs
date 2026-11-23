namespace Caps.Workflow.Domain.Review;

/// <summary>
/// The expert's price and turnaround for one service plus the service's late delivery rule, frozen into a
/// case when the client books it.
/// </summary>
public sealed record ReviewOffer(
    Guid ExpertProfileId,
    Guid ExpertUserId,
    Guid ServiceOfferingId,
    string ServiceCode,
    long Fee,
    short PlatformFeePct,
    int TurnaroundHours,
    int LatePenaltyHours,
    short LatePenaltyPct,
    int LateCancelHours,
    int NoResponseDays,
    short NoResponseRefundPct,
    short NoResponseExpertPct,
    short NoDeliveryRefundPct = 50
);

/// <summary>How the held fee splits when a case completes, in VND.</summary>
public sealed record ReviewSettlement(long ClientRefund, long PlatformFee, long ExpertAmount)
{
    /// <summary>
    /// The split of a delivered case whose client gets latePct back (0 when on time): the refund comes out of
    /// the platform's share first, so the expert keeps theirs unless latePct is above the platform fee.
    /// </summary>
    public static ReviewSettlement Delivered(long fee, short platformFeePct, short latePct)
    {
        var platform = fee * platformFeePct / 100;
        var late = fee * latePct / 100;
        var kept = Math.Max(platform - late, 0);
        return new(late, kept, fee - late - kept);
    }
}
