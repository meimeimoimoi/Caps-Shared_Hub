namespace Caps.Billing.Application.Abstractions;

/// <summary>The split of one settlement and when it happened.</summary>
public sealed record SettlementAmounts(
    DateTimeOffset SettledAt,
    long ExpertPayout,
    long PlatformFee,
    long UserRefund
);
