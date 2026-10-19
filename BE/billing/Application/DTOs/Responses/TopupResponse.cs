namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>
/// A started top-up: open <paramref name="CheckoutUrl"/>, or render <paramref name="QrCode"/> (VietQR payload)
/// next to the beneficiary fields in the app. Credits arrive when the provider confirms the payment, not when this
/// response is returned.
/// </summary>
/// <param name="BankBin">Receiving bank (NAPAS BIN); null when the provider did not return the beneficiary.</param>
/// <param name="TransferNote">Must be kept exactly for a manual transfer: the provider matches the payment by it.</param>
public sealed record TopupResponse(
    string PaymentId,
    long OrderCode,
    long Amount,
    string CheckoutUrl,
    string QrCode,
    DateTimeOffset ExpiresAt,
    string? BankBin,
    string? AccountNumber,
    string? AccountName,
    string? TransferNote
);

/// <summary>Where a top-up stands: PENDING until paid (SUCCEEDED) or the link failed (FAILED).</summary>
/// <param name="ExpiresAt">After this the QR code can no longer be paid; stop polling.</param>
public sealed record TopupStatusResponse(
    string PaymentId,
    long OrderCode,
    long Amount,
    string Status,
    DateTimeOffset ExpiresAt,
    DateTimeOffset? PaidAt
);
