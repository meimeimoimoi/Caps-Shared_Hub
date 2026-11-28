using Caps.Billing.Domain;
using Caps.Common.Domain;

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
    string? ProviderRef,
    DateTimeOffset CreatedAt,
    DateTimeOffset? CompletedAt,
    DateTimeOffset TransferableFrom,
    DateTimeOffset? DueAt,
    DateTimeOffset? RemindAt,
    bool AttemptsExhausted,
    PayoutHistoryResponse[] History
)
{
    public static PayoutResponse From(PayoutTransaction x, WorkCalendar calendar) =>
        new(
            x.Id.ToString(),
            x.SettlementId.ToString(),
            x.PayoutType,
            x.RecipientUserId.ToString(),
            x.Amount,
            x.SnapBankName,
            x.SnapAccountLast4,
            x.SnapHolderName,
            x.Status,
            x.AttemptCount,
            x.LastError,
            x.ProviderRef,
            x.CreatedAt,
            x.CompletedAt,
            x.TransferableFrom,
            x.DueAt(calendar),
            x.RemindAt(calendar),
            x.AttemptsExhausted,
            [
                .. x
                    .History.OrderBy(h => h.At)
                    .Select(h => new PayoutHistoryResponse(
                        h.Status,
                        h.AttemptNo,
                        h.AccountLast4,
                        h.ActorUserId?.ToString(),
                        h.Note,
                        h.At
                    )),
            ]
        );
}

/// <summary>A page of payouts, newest first.</summary>
public sealed record PayoutPageResponse(PayoutResponse[] Items, int Page, int PageSize, int Total);

/// <summary>One status change of a payout; ActorUserId is null when the system or PayOS made it.</summary>
public sealed record PayoutHistoryResponse(
    string Status,
    int AttemptNo,
    string? AccountLast4,
    string? ActorUserId,
    string? Note,
    DateTimeOffset At
);
