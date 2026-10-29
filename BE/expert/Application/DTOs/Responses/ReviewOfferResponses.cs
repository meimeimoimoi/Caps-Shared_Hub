namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>
/// What the workflow service freezes into a new review case: the expert's price and turnaround, the platform fee
/// and late delivery rule in force, and the free slots right now.
/// </summary>
public sealed record ReviewOfferResponse(
    Guid ExpertUserId,
    Guid ServiceOfferingId,
    long Fee,
    int TurnaroundHours,
    int PlatformFeePercent,
    int LatePenaltyHours,
    int LatePenaltyPercent,
    int LateCancelHours,
    int FreeSlots
);
