namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>Money settled in one calendar month (Vietnam time). Amounts are in VND (one credit is one VND).</summary>
/// <param name="Start">First day of the month, yyyy-MM-dd.</param>
/// <param name="Partial">The month is still running.</param>
public sealed record BillingStatPeriodResponse(
    string Start,
    bool Partial,
    long ExpertPayout,
    long PlatformFee,
    long Refunds
);

/// <summary>How many records are in one status and their total amount in VND.</summary>
public sealed record StatusTotalResponse(string Status, int Count, long Amount);

/// <summary>Billing figures for the System Admin dashboard.</summary>
/// <param name="Periods">Oldest month first, ending with the current (partial) month.</param>
/// <param name="Escrows">Escrows per status right now.</param>
/// <param name="Payouts">Payouts per status right now.</param>
public sealed record BillingStatsResponse(
    BillingStatPeriodResponse[] Periods,
    StatusTotalResponse[] Escrows,
    StatusTotalResponse[] Payouts
);
