using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for escrows (unique per review case).</summary>
public sealed class EscrowRepository(BillingDbContext db) : IEscrowRepository
{
    public Task<Escrow?> LockByReviewCaseAsync(Guid reviewCaseId, CancellationToken ct) =>
        db
            .Escrows.FromSqlInterpolated(
                $"SELECT * FROM billing.escrow WHERE review_case_id = {reviewCaseId} FOR UPDATE"
            )
            .SingleOrDefaultAsync(ct);

    public void Add(Escrow escrow) => db.Escrows.Add(escrow);

    public Task<int> CountAsync(CancellationToken ct) => db.Escrows.CountAsync(ct);

    public async Task<IReadOnlyList<Escrow>> ListAsync(int skip, int take, CancellationToken ct) =>
        await db
            .Escrows.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);
}
