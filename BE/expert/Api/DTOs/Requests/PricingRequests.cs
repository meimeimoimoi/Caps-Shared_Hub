namespace Caps.Expert.Api.DTOs.Requests;

/// <summary>The price (whole VND, steps of 10,000) and delivery time in hours (whole days) for one service.</summary>
public sealed record SetServiceRequest(long Fee, int TurnaroundHours);

/// <summary>
/// The platform's share of one service, 0-50 percent, and the day it takes effect (Vietnam time, at least the
/// notice days away); EffectiveOn may be left out only for the first fee of a service.
/// </summary>
public sealed record SetPlatformFeeRequest(
    int Percent,
    int LatePenaltyHours,
    int LatePenaltyPercent,
    int LateCancelHours,
    int NoResponseHours,
    int NoResponseRefundPercent,
    int NoResponseExpertPercent,
    DateOnly? EffectiveOn
);
