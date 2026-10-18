namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>
/// A started top-up: open <paramref name="CheckoutUrl"/> or render <paramref name="QrCode"/> (VietQR payload).
/// Credits arrive when the provider confirms the payment, not when this response is returned.
/// </summary>
public sealed record TopupResponse(
    string PaymentId,
    long OrderCode,
    long Amount,
    string CheckoutUrl,
    string QrCode,
    DateTimeOffset ExpiresAt
);
