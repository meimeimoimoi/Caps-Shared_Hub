namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>One of the expert's packages: the price set and what the expert receives after the platform fee.</summary>
public sealed record MyServiceResponse(
    Guid Id,
    string ServiceType,
    long Fee,
    int TurnaroundHours,
    int PlatformFeePercent,
    long NetAmount
);

/// <summary>The current platform fee of one service.</summary>
public sealed record PlatformFeeResponse(
    string ServiceType,
    int Percent,
    DateTimeOffset EffectiveFrom
);
