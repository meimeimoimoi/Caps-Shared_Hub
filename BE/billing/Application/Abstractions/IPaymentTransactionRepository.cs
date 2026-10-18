using Caps.Billing.Domain;

namespace Caps.Billing.Application.Abstractions;

/// <summary>Payments made through the payment provider.</summary>
public interface IPaymentTransactionRepository
{
    /// <summary>Locks the row (FOR UPDATE) so concurrent notifications for one order run one at a time.</summary>
    Task<PaymentTransaction?> LockByOrderCodeAsync(string orderCode, CancellationToken ct);

    void Add(PaymentTransaction payment);
}
