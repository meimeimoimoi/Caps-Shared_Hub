using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core queries behind the admin dashboard; nothing is tracked.</summary>
public sealed class BillingStatsReader(BillingDbContext db) : IBillingStatsReader
{
    public async Task<IReadOnlyList<SettlementAmounts>> ListSettlementsAsync(
        DateTimeOffset start,
        DateTimeOffset endBefore,
        CancellationToken ct
    ) =>
        await db
            .Settlements.AsNoTracking()
            .Where(x => x.SettledAt >= start && x.SettledAt < endBefore)
            .Select(x => new SettlementAmounts(
                x.SettledAt,
                x.ExpertPayoutAmount,
                x.PlatformFeeAmount,
                x.UserRefundAmount
            ))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<StatusTotalResponse>> TotalEscrowsByStatusAsync(
        CancellationToken ct
    ) =>
        await db
            .Escrows.AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(g => new StatusTotalResponse(g.Key, g.Count(), g.Sum(x => x.Amount)))
            .ToListAsync(ct);

    public async Task<IReadOnlyList<StatusTotalResponse>> TotalPayoutsByStatusAsync(
        CancellationToken ct
    ) =>
        await db
            .PayoutTransactions.AsNoTracking()
            .GroupBy(x => x.Status)
            .Select(g => new StatusTotalResponse(g.Key, g.Count(), g.Sum(x => x.Amount)))
            .ToListAsync(ct);
}
