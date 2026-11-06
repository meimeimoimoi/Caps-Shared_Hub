using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Credit packages, listed in display order (sort order, then name).</summary>
public interface ICreditPackageRepository
{
    /// <summary>Read-only list for display; <paramref name="onSaleOnly"/> leaves out packages taken off sale.</summary>
    Task<IReadOnlyList<CreditPackage>> ListAsync(bool onSaleOnly, CancellationToken ct);

    /// <summary>Tracked package, for buying or editing it.</summary>
    Task<CreditPackage?> FindAsync(Guid id, CancellationToken ct);

    void Add(CreditPackage package);
}
