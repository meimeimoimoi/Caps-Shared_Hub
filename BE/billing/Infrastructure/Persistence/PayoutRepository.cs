using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for payouts (index status, created_at).</summary>
public sealed class PayoutRepository(BillingDbContext db) : IPayoutRepository
{
    public async Task<IReadOnlyList<PayoutTransaction>> ListAsync(
        string? status,
        int skip,
        int take,
        CancellationToken ct
    ) =>
        await Filter(status)
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);

    public Task<int> CountAsync(string? status, CancellationToken ct) =>
        Filter(status).CountAsync(ct);

    private IQueryable<PayoutTransaction> Filter(string? status) =>
        status == null
            ? db.PayoutTransactions.AsNoTracking()
            : db.PayoutTransactions.AsNoTracking().Where(x => x.Status == status);
}
