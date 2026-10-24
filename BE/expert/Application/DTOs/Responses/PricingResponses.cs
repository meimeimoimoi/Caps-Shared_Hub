namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>
/// One service open for pricing and the expert's price for it: the fee set and what the expert receives after the
/// platform fee. Fee, TurnaroundHours and NetAmount are null until the expert prices the service.
/// </summary>
public sealed record MyServiceResponse(
    string ServiceCode,
    long? Fee,
    int? TurnaroundHours,
    int PlatformFeePercent,
    long? NetAmount
);

/// <summary>One catalog service and its current platform fee; Percent and EffectiveFrom are null until set.</summary>
public sealed record PlatformFeeResponse(
    string ServiceCode,
    string ServiceName,
    int? Percent,
    DateTimeOffset? EffectiveFrom
);
