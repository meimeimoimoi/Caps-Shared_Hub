namespace Caps.Billing.Application.Abstractions;

/// <summary>An order to pay through the provider; the link stops accepting payments at <paramref name="ExpiresAt"/>.</summary>
public sealed record PaymentLinkRequest(
    long OrderCode,
    long Amount,
    string Description,
    DateTimeOffset ExpiresAt
);

/// <summary>
/// Where the user pays: a hosted checkout page, the VietQR payload for banking apps and the account it pays into
/// (null when the provider did not return it).
/// </summary>
public sealed record PaymentLink(
    string CheckoutUrl,
    string QrCode,
    string PaymentLinkId,
    PaymentBeneficiary? Beneficiary
);

/// <summary>The receiving bank account and the exact transfer note the provider matches the payment by.</summary>
public sealed record PaymentBeneficiary(
    string BankBin,
    string AccountNumber,
    string AccountName,
    string Description
);

/// <summary>An authenticated provider notification; <paramref name="Paid"/> is false for non-success codes.</summary>
public sealed record PaymentNotice(long OrderCode, long Amount, bool Paid);
