using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Marketplace;

/// <summary>The client's filters and the page of the marketplace list.</summary>
public sealed record SearchExpertQuery(MarketplaceFilter Filter, int Page, int PageSize);

/// <summary>Searches approved experts; the recommended order puts the best available experts first.</summary>
public sealed class SearchExpertHandler(IMarketplaceReader marketplace)
    : IQueryHandler<SearchExpertQuery, MarketplacePage>
{
    private const int MaxPageSize = 50;

    public async Task<MarketplacePage> HandleAsync(SearchExpertQuery query, CancellationToken ct)
    {
        var page = Math.Max(query.Page, 1);
        var size = Math.Clamp(query.PageSize, 1, MaxPageSize);
        // Service codes are stored lowercase; a badly formed code just matches nothing (no 400 on search)
        var filter = query.Filter with
        {
            ServiceType = string.IsNullOrWhiteSpace(query.Filter.ServiceType)
                ? null
                : query.Filter.ServiceType.Trim().ToLowerInvariant(),
        };
        // One extra row tells whether a next page exists, without counting the whole table
        var rows = await marketplace.SearchAsync(filter, (page - 1) * size, size + 1, ct);
        return new(rows.Take(size).ToList(), page, rows.Count > size);
    }
}
