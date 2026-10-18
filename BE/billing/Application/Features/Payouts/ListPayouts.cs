using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Lists payouts for staff, optionally only those in one status.</summary>
public sealed record ListPayoutsQuery(string? Status, int Page, int PageSize);

/// <summary>Newest first; an empty page until settlements start creating payouts.</summary>
public sealed class ListPayoutsHandler(IPayoutRepository payouts)
    : IQueryHandler<ListPayoutsQuery, PayoutPageResponse>
{
    public const int MaxPageSize = 100;

    public async Task<PayoutPageResponse> HandleAsync(ListPayoutsQuery query, CancellationToken ct)
    {
        if (query.Page < 1 || query.PageSize < 1 || query.PageSize > MaxPageSize)
            throw BillingErrors.InvalidPaging(MaxPageSize);
        var status = string.IsNullOrWhiteSpace(query.Status)
            ? null
            : query.Status.Trim().ToUpperInvariant();
        var total = await payouts.CountAsync(status, ct);
        var page = await payouts.ListAsync(
            status,
            (query.Page - 1) * query.PageSize,
            query.PageSize,
            ct
        );
        var items = page.Select(x => new PayoutResponse(
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
                x.CreatedAt,
                x.CompletedAt
            ))
            .ToArray();
        return new PayoutPageResponse(items, query.Page, query.PageSize, total);
    }
}
