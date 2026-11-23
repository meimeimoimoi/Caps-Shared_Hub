namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>
/// The price (whole VND, steps of 10,000) for one service. TurnaroundHours is optional: the deadline is one working
/// day for every case (meeting of 2026-11-11), so the UI no longer asks for it.
/// </summary>
public sealed record SetServiceRequest(long Fee, int? TurnaroundHours = null);

/// <summary>
/// The platform's share of one service, 0-50 percent, and the day it takes effect (Vietnam time, at least the
/// notice days away); EffectiveOn may be left out only for the first fee of a service.
/// </summary>
public sealed record SetPlatformFeeRequest(
    int Percent,
    int LatePenaltyHours,
    int LatePenaltyPercent,
    int LateCancelHours,
    int NoResponseDays,
    int NoResponseRefundPercent,
    int NoResponseExpertPercent,
    int? NoDeliveryRefundPercent,
    DateOnly? EffectiveOn,
    string? Reason
);
