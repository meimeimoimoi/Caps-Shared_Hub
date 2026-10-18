using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Append-only wallet movements, read newest first.</summary>
public interface ICreditLedgerRepository
{
    Task<IReadOnlyList<CreditLedger>> ListAsync(
        Guid userId,
        int skip,
        int take,
        CancellationToken ct
    );

    Task<int> CountAsync(Guid userId, CancellationToken ct);
}
