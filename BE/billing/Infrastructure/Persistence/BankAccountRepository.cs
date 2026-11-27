using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for bank accounts (soft-deleted rows stay for payout history).</summary>
public sealed class BankAccountRepository(BillingDbContext db) : IBankAccountRepository
{
    public async Task<IReadOnlyList<BankAccount>> ListAsync(Guid userId, CancellationToken ct) =>
        await db
            .BankAccounts.AsNoTracking()
            .Where(x => x.UserId == userId && x.DeletedAt == null)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<BankAccount>> ListForUpdateAsync(
        Guid userId,
        CancellationToken ct
    ) =>
        await db.BankAccounts.Where(x => x.UserId == userId && x.DeletedAt == null).ToListAsync(ct);

    public void Add(BankAccount account) => db.BankAccounts.Add(account);

    public Task<BankAccount?> FindAsync(Guid id, CancellationToken ct) =>
        db
            .BankAccounts.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id && x.DeletedAt == null, ct);

    public async Task<IReadOnlyList<BankAccount>> ListByStatusAsync(
        string? status,
        int skip,
        int take,
        CancellationToken ct
    ) =>
        await ByStatus(status)
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip(skip)
            .Take(take)
            .ToListAsync(ct);

    public Task<int> CountByStatusAsync(string? status, CancellationToken ct) =>
        ByStatus(status).CountAsync(ct);

    private IQueryable<BankAccount> ByStatus(string? status)
    {
        var linked = db.BankAccounts.AsNoTracking().Where(x => x.DeletedAt == null);
        return status == null ? linked : linked.Where(x => x.Status == status);
    }
}
