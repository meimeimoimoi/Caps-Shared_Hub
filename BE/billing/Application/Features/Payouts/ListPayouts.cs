using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>Lists payouts for staff, optionally only those in one status.</summary>
public sealed record ListPayoutsQuery(
    string? Status,
    int Page,
    int PageSize,
    string? SortBy = null,
    bool SortDescending = true,
    Guid? RecipientUserId = null,
    DateTimeOffset? From = null,
    DateTimeOffset? To = null,
    long? MinAmount = null,
    long? MaxAmount = null
);

/// <summary>Newest first; released escrows create the expert payouts.</summary>
public sealed class ListPayoutsHandler(IPayoutRepository payouts, WorkCalendar calendar)
    : IQueryHandler<ListPayoutsQuery, PayoutPageResponse>
{
    public const int MaxPageSize = 100;

    public async Task<PayoutPageResponse> HandleAsync(ListPayoutsQuery query, CancellationToken ct)
    {
        if (query.Page < 1 || query.PageSize < 1 || query.PageSize > MaxPageSize)
            throw BillingErrors.InvalidPaging(MaxPageSize);
        var filter = new PayoutFilter(
            string.IsNullOrWhiteSpace(query.Status) ? null : query.Status.Trim().ToUpperInvariant(),
            query.RecipientUserId,
            // Staff pick Vietnam days; PostgreSQL timestamptz only takes UTC offsets
            query.From?.ToUniversalTime(),
            query.To?.ToUniversalTime(),
            query.MinAmount,
            query.MaxAmount
        );
        var total = await payouts.CountAsync(filter, ct);
        var page = await payouts.ListAsync(
            filter,
            (query.Page - 1) * query.PageSize,
            query.PageSize,
            ct,
            query.SortBy is "amount" or "createdAt" ? query.SortBy : "due",
            query.SortDescending
        );
        var items = page.Select(x => PayoutResponse.From(x, calendar)).ToArray();
        return new PayoutPageResponse(items, query.Page, query.PageSize, total);
    }
}
