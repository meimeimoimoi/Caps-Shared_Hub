namespace Caps.Billing.Application.DTOs.Responses;

/// <summary>One wallet movement; Amount is positive for credits and negative for debits.</summary>
public sealed record LedgerEntryResponse(
    string Id,
    string EntryType,
    long Amount,
    long BalanceAfter,
    string? Note,
    DateTimeOffset CreatedAt
);

/// <summary>A page of wallet movements, newest first.</summary>
public sealed record LedgerPageResponse(
    LedgerEntryResponse[] Items,
    int Page,
    int PageSize,
    int Total
);
