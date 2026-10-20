using Caps.Common.Application;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Marketplace;

/// <summary>Public Marketplace search; null service means every service.</summary>
public sealed record ListMarketplaceExpertsQuery(string? ServiceCode);

/// <summary>Only experts meeting BR-M01 for at least one service are returned.</summary>
public sealed class ListMarketplaceExpertsHandler(IMarketplaceListing listing)
    : IQueryHandler<ListMarketplaceExpertsQuery, IReadOnlyList<MarketplaceExpertResponse>>
{
    public Task<IReadOnlyList<MarketplaceExpertResponse>> HandleAsync(
        ListMarketplaceExpertsQuery query,
        CancellationToken ct
    ) =>
        listing.ListAsync(
            string.IsNullOrWhiteSpace(query.ServiceCode)
                ? null
                : query.ServiceCode.Trim().ToUpperInvariant(),
            null,
            ct
        );
}
