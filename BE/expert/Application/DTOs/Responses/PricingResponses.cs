namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>
/// One service open for pricing and the expert's price for it: the fee set and what the expert receives after the
/// platform fee. Fee, TurnaroundHours and NetAmount are null until the expert prices the service.
/// </summary>
/// <param name="PendingPlatformFee">An announced platform fee change that has not taken effect yet.</param>
/// <param name="Limits">The ranges the price and turnaround must fall within (admin policy).</param>
public sealed record MyServiceResponse(
    string ServiceCode,
    long? Fee,
    int? TurnaroundHours,
    int PlatformFeePercent,
    long? NetAmount,
    PendingPlatformFeeResponse? PendingPlatformFee,
    PricingLimitsResponse Limits
);

/// <summary>The price and turnaround ranges in force, and the change that shows a red warning.</summary>
public sealed record PricingLimitsResponse(
    long MinFee,
    long MaxFee,
    long FeeStep,
    int MinTurnaroundDays,
    int MaxTurnaroundDays,
    int ChangeWarningPercent
);

/// <summary>What a late delivery costs: the penalty band, then a full refund until the case is cancelled.</summary>
public sealed record LateRuleResponse(int PenaltyHours, int PenaltyPercent, int CancelHours);

/// <summary>A platform fee change waiting for its effective date.</summary>
public sealed record PendingPlatformFeeResponse(
    int Percent,
    LateRuleResponse Late,
    DateTimeOffset EffectiveFrom
);

/// <summary>
/// One catalog service with its platform fee in force (null until the first one) and any pending change.
/// </summary>
/// <param name="EarliestEffectiveOn">First day a new change may take effect, given the notice days.</param>
public sealed record PlatformFeeResponse(
    string ServiceCode,
    string ServiceName,
    int? Percent,
    LateRuleResponse? Late,
    DateTimeOffset? EffectiveFrom,
    PendingPlatformFeeResponse? Pending,
    DateOnly EarliestEffectiveOn,
    int NoticeDays,
    int MaxPercent
);

/// <summary>One saved price of the expert's offering, old and new values side by side.</summary>
public sealed record ServiceOfferingChangeResponse(
    long? OldFee,
    long NewFee,
    int? OldTurnaroundHours,
    int NewTurnaroundHours,
    DateTimeOffset ChangedAt
);
