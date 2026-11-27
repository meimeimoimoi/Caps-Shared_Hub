namespace Caps.Billing.Application.Abstractions;

/// <summary>The payment provider (PayOS): creates payment links, looks them up and authenticates its notifications.</summary>
public interface IPaymentGateway
{
    /// <summary>
    /// The provider's current view of an order, in the same shape as a notification (Amount is the paid amount).
    /// Throws PAYMENT_UNAVAILABLE when the provider is not configured, down, or has no clear answer.
    /// </summary>
    Task<PaymentNotice> FindPaymentAsync(long orderCode, CancellationToken ct);

    /// <summary>Throws PAYMENT_UNAVAILABLE when the provider is not configured, down or refuses the order.</summary>
    Task<PaymentLink> CreateLinkAsync(PaymentLinkRequest request, CancellationToken ct);

    /// <summary>
    /// Verifies the signature of a raw notification body and reads it; throws INVALID_WEBHOOK_SIGNATURE when the
    /// body is malformed or not signed by the provider.
    /// </summary>
    PaymentNotice ReadNotice(string body);
}
