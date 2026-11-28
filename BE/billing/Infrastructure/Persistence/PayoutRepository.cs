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
        CancellationToken ct,
        string sortBy = "createdAt",
        bool descending = true
    )
    {
        var source = Filter(status);
        var ordered =
            sortBy == "amount"
                ? descending
                    ? source.OrderByDescending(x => x.Amount)
                    : source.OrderBy(x => x.Amount)
                : descending
                    ? source.OrderByDescending(x => x.CreatedAt)
                    : source.OrderBy(x => x.CreatedAt);
        var stable = descending ? ordered.ThenByDescending(x => x.Id) : ordered.ThenBy(x => x.Id);
        return await stable.Include(x => x.History).Skip(skip).Take(take).ToListAsync(ct);
    }

    public Task<int> CountAsync(string? status, CancellationToken ct) =>
        Filter(status).CountAsync(ct);

    public Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct) =>
        db
            .PayoutTransactions.FromSqlInterpolated(
                $"SELECT * FROM billing.payout_transaction WHERE id = {id} FOR UPDATE"
            )
            .SingleOrDefaultAsync(ct);

    public async Task<IReadOnlyList<PayoutTransaction>> ListUnsentAsync(CancellationToken ct) =>
        await db
            .PayoutTransactions.AsNoTracking()
            .Where(x => x.Status == PayoutStatus.Pending || x.Status == PayoutStatus.Failed)
            .ToListAsync(ct);

    private IQueryable<PayoutTransaction> Filter(string? status) =>
        status == null
            ? db.PayoutTransactions.AsNoTracking()
            : db.PayoutTransactions.AsNoTracking().Where(x => x.Status == status);
}
