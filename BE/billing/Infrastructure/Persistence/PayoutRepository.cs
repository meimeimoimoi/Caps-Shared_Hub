using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for payouts (index status, created_at).</summary>
public sealed class PayoutRepository(BillingDbContext db) : IPayoutRepository
{
    public async Task<IReadOnlyList<PayoutTransaction>> ListAsync(
        PayoutFilter filter,
        int skip,
        int take,
        CancellationToken ct,
        string sortBy = "due",
        bool descending = true
    )
    {
        var source = Filter(filter);
        var ordered = sortBy switch
        {
            "amount" => descending
                ? source.OrderByDescending(x => x.Amount)
                : source.OrderBy(x => x.Amount),
            "createAt" => descending
                ? source.OrderByDescending(x => x.CreatedAt)
                : source.OrderBy(x => x.CreatedAt),
            // Unsent first, oldest first: an older payout always reaches its hold end and deadline sooner
            _ => source
                .OrderBy(x =>
                    x.Status == PaymentStatus.Pending || x.Status == PayoutStatus.Failed ? 0 : 1
                )
                .ThenBy(x => x.CreatedAt),
        };
        return await ordered
            .ThenBy(x => x.Id)
            .Include(x => x.History)
            .Include(x => x.BankAccount)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);
    }

    public Task<int> CountAsync(PayoutFilter filter, CancellationToken ct) =>
        Filter(filter).CountAsync(ct);

    public Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct) =>
        db
            .PayoutTransactions.FromSqlInterpolated(
                $"SELECT * FROM billing.payout_transaction WHERE id = {id} FOR UPDATE"
            )
            .SingleOrDefaultAsync(ct);

    public Task<PayoutTransaction?> GetAsync(Guid id, CancellationToken ct) =>
        db.PayoutTransactions.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, ct);

    public Task<bool> ProviderRefExistsAsync(string providerRef, CancellationToken ct) =>
        db.PayoutTransactions.AnyAsync(x => x.ProviderRef == providerRef, ct);

    public async Task<IReadOnlyList<PayoutTransaction>> ListPaidAsync(
        DateTimeOffset paidFrom,
        DateTimeOffset paidTo,
        CancellationToken ct
    ) =>
        await db
            .PayoutTransactions.AsNoTracking()
            .Include(x => x.Settlement)
            .Include(x => x.History)
            .Where(x =>
                x.Status == PayoutStatus.Succeeded
                && x.CompletedAt >= paidFrom
                && x.CompletedAt < paidTo
            )
            .OrderBy(x => x.CompletedAt)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<PayoutTransaction>> ListUnsentAsync(CancellationToken ct) =>
        await db
            .PayoutTransactions.AsNoTracking()
            .Include(x => x.BankAccount)
            .Where(x => x.Status == PayoutStatus.Pending || x.Status == PayoutStatus.Failed)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<PayoutTransaction>> ListUnsentForAsync(
        Guid recipientUserId,
        CancellationToken ct
    ) =>
        await db
            .PayoutTransactions.Include(x => x.BankAccount)
            .Where(x =>
                x.RecipientUserId == recipientUserId
                && (x.Status == PayoutStatus.Pending || x.Status == PayoutStatus.Failed)
            )
            .ToListAsync(ct);

    private IQueryable<PayoutTransaction> Filter(PayoutFilter f)
    {
        var q = db.PayoutTransactions.AsNoTracking();
        if (f.Status != null)
        {
            q = q.Where(x => x.Status == f.Status);
        }
        if (f.RecipientUserId != null)
        {
            q = q.Where(x => x.RecipientUserId == f.RecipientUserId);
        }
        if (f.From != null)
        {
            q = q.Where(x => x.CreatedAt >= f.From);
        }
        if (f.To != null)
        {
            q = q.Where(x => x.CreatedAt < f.To);
        }
        if (f.MinAmount != null)
        {
            q = q.Where(x => x.Amount >= f.MinAmount);
        }
        if (f.MaxAmount != null)
        {
            q = q.Where(x => x.Amount <= f.MaxAmount);
        }
        return q;
    }
}
