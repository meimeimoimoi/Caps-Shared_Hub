using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Escrows;

/// <summary>Lists escrows for staff, optionally only those in one status.</summary>
public sealed record ListEscrowsQuery(string? Status, int Page, int PageSize);

/// <summary>Newest first; staff pick one to release or refund.</summary>
public sealed class ListEscrowsHandler(IEscrowRepository escrows)
    : IQueryHandler<ListEscrowsQuery, EscrowPageResponse>
{
    public const int MaxPageSize = 100;

    public async Task<EscrowPageResponse> HandleAsync(ListEscrowsQuery query, CancellationToken ct)
    {
        if (query.Page < 1 || query.PageSize < 1 || query.PageSize > MaxPageSize)
            throw BillingErrors.InvalidPaging(MaxPageSize);
        var status = string.IsNullOrWhiteSpace(query.Status)
            ? null
            : query.Status.Trim().ToUpperInvariant();
        var total = await escrows.CountAsync(status, ct);
        var page = await escrows.ListAsync(
            status,
            (query.Page - 1) * query.PageSize,
            query.PageSize,
            ct
        );
        var items = page.Select(EscrowResponse.From).ToArray();
        return new EscrowPageResponse(items, query.Page, query.PageSize, total);
    }
}
