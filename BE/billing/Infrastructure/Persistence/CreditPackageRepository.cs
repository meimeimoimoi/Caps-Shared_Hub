using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Billing.Infrastructure.Persistence;

/// <summary>EF Core store for credit packages (a handful of rows, so lists are not paged).</summary>
public sealed class CreditPackageRepository(BillingDbContext db) : ICreditPackageRepository
{
    public async Task<IReadOnlyList<CreditPackage>> ListAsync(
        bool onSaleOnly,
        CancellationToken ct
    ) =>
        await db
            .CreditPackages.AsNoTracking()
            .Where(x => !onSaleOnly || x.OnSale)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.Name)
            .ToListAsync(ct);

    public Task<CreditPackage?> FindAsync(Guid id, CancellationToken ct) =>
        db.CreditPackages.FirstOrDefaultAsync(x => x.Id == id, ct);

    public void Add(CreditPackage package) => db.CreditPackages.Add(package);
}
