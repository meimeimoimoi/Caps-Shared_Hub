using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Marketplace;

/// <summary>Search filters and page of the public expert list.</summary>
public sealed record SearchExpertQuery(string? Keyword, string? Field, int Page, int PageSize);

/// <summary>Lists approved experts taking new cases with a free slot (running cases below capacity).</summary>
public sealed class SearchExpertHandler(IMarketplaceReader marketplace)
    : IQueryHandler<SearchExpertQuery, MarketplacePage>
{
    private const int MaxPageSize = 50;

    public async Task<MarketplacePage> HandleAsync(SearchExpertQuery query, CancellationToken ct)
    {
        var page = Math.Max(query.Page, 1);
        var size = Math.Clamp(query.PageSize, 1, MaxPageSize);

        var rows = await marketplace.SearchAsync(
            query.Keyword,
            query.Field,
            (page - 1) * size,
            size + 1,
            ct
        );
        return new(rows.Take(size).ToList(), page, rows.Count > size);
    }
}
