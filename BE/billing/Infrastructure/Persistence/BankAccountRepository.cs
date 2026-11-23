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
}
