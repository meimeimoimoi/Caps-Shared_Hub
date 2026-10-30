namespace Caps.Workflow.Domain.Review;

/// <summary>
/// The expert's price and turnaround for one service plus the service's late delivery rule, frozen into a
/// case when the client books it.
/// </summary>
public sealed record ReviewOffer(
    Guid ExpertProfileId,
    Guid ExpertUserId,
    Guid ServiceOfferingId,
    long Fee,
    short PlatformFeePct,
    int TurnaroundHours,
    int LatePenaltyHours,
    short LatePenaltyPct,
    int LateCancelHours,
    int NoResponseHours,
    short NoResponseRefundPct,
    short NoResponseExpertPct
);

/// <summary>How the held fee splits when a case completes, in VND.</summary>
public sealed record ReviewSettlement(long ClientRefund, long PlatformFee, long ExpertAmount);
