using Caps.Billing.Application.Abstractions;

namespace Caps.Billing.Application.Common;

/// <summary>Credits the wallet for a paid top-up exactly once, whoever learns about the payment first.</summary>
public interface ITopupCrediting
{
    /// <summary>
    /// Expects a notice the provider reported as paid. Unknown orders, review fees and top-ups already credited
    /// are ignored; a paid amount that differs from the order throws PAYMENT_AMOUNT_MISMATCH.
    /// </summary>
    Task CreditAsync(PaymentNotice notice, CancellationToken ct);
}
