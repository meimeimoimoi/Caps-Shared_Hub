namespace Caps.Billing.Application.Abstractions;

/// <summary>The payment provider (PayOS): creates payment links and authenticates its notifications.</summary>
public interface IPaymentGateway
{
    /// <summary>Throws PAYMENT_UNAVAILABLE when the provider is not configured, down or refuses the order.</summary>
    Task<PaymentLink> CreateLinkAsync(PaymentLinkRequest request, CancellationToken ct);

    /// <summary>
    /// Verifies the signature of a raw notification body and reads it; throws INVALID_WEBHOOK_SIGNATURE when the
    /// body is malformed or not signed by the provider.
    /// </summary>
    PaymentNotice ReadNotice(string body);
}
