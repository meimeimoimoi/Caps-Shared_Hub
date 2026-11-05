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

    public async Task<IReadOnlyList<Escrow>> ListAsync(
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

    public void Add(Escrow escrow) => db.Escrows.Add(escrow);

    private IQueryable<Escrow> Filter(string? status) =>
        status == null
            ? db.Escrows.AsNoTracking()
            : db.Escrows.AsNoTracking().Where(x => x.Status == status);
}
