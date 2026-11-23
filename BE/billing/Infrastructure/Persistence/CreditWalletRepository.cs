using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for credit wallets.</summary>
public sealed class CreditWalletRepository(BillingDbContext db) : ICreditWalletRepository
{
    public Task<CreditWallet?> FindAsync(Guid userId, CancellationToken ct) =>
        db.CreditWallets.AsNoTracking().SingleOrDefaultAsync(x => x.UserId == userId, ct);

    public Task<CreditWallet?> FindForUpdateAsync(Guid userId, CancellationToken ct) =>
        db.CreditWallets.SingleOrDefaultAsync(x => x.UserId == userId, ct);

    public void Add(CreditWallet wallet) => db.CreditWallets.Add(wallet);
}
