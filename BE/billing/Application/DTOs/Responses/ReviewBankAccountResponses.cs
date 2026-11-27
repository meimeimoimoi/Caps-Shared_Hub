using Caps.Billing.Domain;

namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>
/// A bank account as staff review it. The full number lets staff look the holder up in a banking app; it is
/// only returned on the staff review endpoints.
/// </summary>
public sealed record ReviewBankAccountResponse(
    string Id,
    string UserId,
    string BankBin,
    string BankName,
    string AccountNumber,
    string AccountHolderName,
    bool IsDefault,
    string Status,
    string? RejectionReason,
    string? ReviewedBy,
    DateTimeOffset? ReviewedAt,
    DateTimeOffset CreatedAt
)
{
    public static ReviewBankAccountResponse From(BankAccount x, string accountNumber) =>
        new(
            x.Id.ToString(),
            x.UserId.ToString(),
            x.BankBin,
            x.BankName,
            accountNumber,
            x.AccountHolderName,
            x.IsDefault,
            x.Status,
            x.RejectionReason,
            x.VerifiedBy?.ToString(),
            x.VerifiedAt,
            x.CreatedAt
        );
}

/// <summary>A page of bank accounts for staff review, newest first.</summary>
public sealed record ReviewBankAccountPageResponse(
    ReviewBankAccountResponse[] Items,
    int Page,
    int PageSize,
    int Total
);
