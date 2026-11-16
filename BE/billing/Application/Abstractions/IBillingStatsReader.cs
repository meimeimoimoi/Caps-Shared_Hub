using Caps.Billing.Application.DTOs.Responses;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Read side of the admin dashboard: money moved per month and what is still held.</summary>
public interface IBillingStatsReader
{
    /// <summary>Settlements whose settled time falls in [start, endBefore), only the columns the statistics need.</summary>
    Task<IReadOnlyList<SettlementAmounts>> ListSettlementsAsync(
        DateTimeOffset start,
        DateTimeOffset endBefore,
        CancellationToken ct
    );

    /// <summary>Escrows per status with their count and total amount, grouped in the database.</summary>
    Task<IReadOnlyList<StatusTotalResponse>> TotalEscrowsByStatusAsync(CancellationToken ct);

    /// <summary>Payouts per status with their count and total amount, grouped in the database.</summary>
    Task<IReadOnlyList<StatusTotalResponse>> TotalPayoutsByStatusAsync(CancellationToken ct);
}
