using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for wallet movements (index user_id, created_at).</summary>
public sealed class CreditLedgerRepository(BillingDbContext db) : ICreditLedgerRepository
{
    public async Task<IReadOnlyList<CreditLedger>> ListAsync(
        Guid userId,
        int skip,
        int take,
        CancellationToken ct
    ) =>
        await db
            .CreditLedgers.AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);

    public Task<int> CountAsync(Guid userId, CancellationToken ct) =>
        db.CreditLedgers.CountAsync(x => x.UserId == userId, ct);

    public void Add(CreditLedger entry) => db.CreditLedgers.Add(entry);
}
