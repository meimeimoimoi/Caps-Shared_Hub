using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Credit wallets, one per account.</summary>
public interface ICreditWalletRepository
{
    /// <summary>Read-only, for display.</summary>
    Task<CreditWallet?> FindAsync(Guid userId, CancellationToken ct);

    /// <summary>
    /// Tracked, for a balance change. Every writer of a wallet holds <see cref="IBillingUserLock"/> first,
    /// so balance updates of one user never interleave.
    /// </summary>
    Task<CreditWallet?> FindForUpdateAsync(Guid userId, CancellationToken ct);

    void Add(CreditWallet wallet);
}
