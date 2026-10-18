namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>One payout or refund transfer, with the bank details copied when it was created.</summary>
public sealed record PayoutResponse(
    string Id,
    string SettlementId,
    string PayoutType,
    string RecipientUserId,
    long Amount,
    string? BankName,
    string? AccountLast4,
    string? HolderName,
    string Status,
    int AttemptCount,
    string? LastError,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt
);

/// <summary>A page of payouts, newest first.</summary>
public sealed record PayoutPageResponse(PayoutResponse[] Items, int Page, int PageSize, int Total);
