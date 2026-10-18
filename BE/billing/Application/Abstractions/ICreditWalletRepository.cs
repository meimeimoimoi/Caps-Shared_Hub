using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Credit wallets, one per account.</summary>
public interface ICreditWalletRepository
{
    Task<CreditWallet?> FindAsync(Guid userId, CancellationToken ct);
}
