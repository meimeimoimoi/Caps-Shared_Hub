using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Escrows;

/// <summary>Lists the escrows for staff, one page at a time.</summary>
public sealed record ListEscrowsQuery(int Page, int PageSize);

/// <summary>Newest first; held ones can then be released or refunded from the same screen.</summary>
public sealed class ListEscrowsHandler(IEscrowRepository escrows)
    : IQueryHandler<ListEscrowsQuery, EscrowPageResponse>
{
    public const int MaxPageSize = 100;

    public async Task<EscrowPageResponse> HandleAsync(ListEscrowsQuery query, CancellationToken ct)
    {
        if (query.Page < 1 || query.PageSize < 1 || query.PageSize > MaxPageSize)
            throw BillingErrors.InvalidPaging(MaxPageSize);
        var total = await escrows.CountAsync(ct);
        var page = await escrows.ListAsync((query.Page - 1) * query.PageSize, query.PageSize, ct);
        return new EscrowPageResponse(
            [.. page.Select(EscrowResponse.From)],
            query.Page,
            query.PageSize,
            total
        );
    }
}
