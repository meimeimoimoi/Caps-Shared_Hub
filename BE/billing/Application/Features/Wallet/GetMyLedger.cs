using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.Application.Features.Wallet;

/// <summary>Reads one page of the signed-in user's wallet history.</summary>
public sealed record GetMyLedgerQuery(Guid UserId, int Page, int PageSize);

/// <summary>Returns movements newest first; an empty page when the user has none.</summary>
public sealed class GetMyLedgerHandler(ICreditLedgerRepository ledger)
    : IQueryHandler<GetMyLedgerQuery, LedgerPageResponse>
{
    public const int MaxPageSize = 100;

    public async Task<LedgerPageResponse> HandleAsync(GetMyLedgerQuery query, CancellationToken ct)
    {
        if (query.Page < 1 || query.PageSize < 1 || query.PageSize > MaxPageSize)
            throw BillingErrors.InvalidPaging(MaxPageSize);
        var total = await ledger.CountAsync(query.UserId, ct);
        var entries = await ledger.ListAsync(
            query.UserId,
            (query.Page - 1) * query.PageSize,
            query.PageSize,
            ct
        );
        var items = entries
            .Select(x => new LedgerEntryResponse(
                x.Id.ToString(),
                x.EntryType,
                x.Amount,
                x.BalanceAfter,
                x.Note,
                x.CreatedAt
            ))
            .ToArray();
        return new LedgerPageResponse(items, query.Page, query.PageSize, total);
    }
}
