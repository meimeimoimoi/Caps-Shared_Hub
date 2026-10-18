namespace Caps.Billing.Application.Abstractions;

/// <summary>An order to pay through the provider; the link stops accepting payments at <paramref name="ExpiresAt"/>.</summary>
public sealed record PaymentLinkRequest(
    long OrderCode,
    long Amount,
    string Description,
    DateTimeOffset ExpiresAt
);

/// <summary>Where the user pays: a hosted checkout page and the VietQR payload for banking apps.</summary>
public sealed record PaymentLink(string CheckoutUrl, string QrCode, string PaymentLinkId);

/// <summary>An authenticated provider notification; <paramref name="Paid"/> is false for non-success codes.</summary>
public sealed record PaymentNotice(long OrderCode, long Amount, bool Paid);
