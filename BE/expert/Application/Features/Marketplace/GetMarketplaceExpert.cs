using Caps.Common.Application;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Marketplace;

/// <summary>Public profile of one listed expert.</summary>
public sealed record GetMarketplaceExpertQuery(Guid ExpertId);

/// <summary>EXPERT_NOT_FOUND when the expert is unknown or not listed for any service (BR-M01).</summary>
public sealed class GetMarketplaceExpertHandler(IMarketplaceListing listing)
    : IQueryHandler<GetMarketplaceExpertQuery, MarketplaceExpertResponse>
{
    public async Task<MarketplaceExpertResponse> HandleAsync(
        GetMarketplaceExpertQuery query,
        CancellationToken ct
    )
    {
        var found = await listing.ListAsync(null, query.ExpertId, ct);
        return found.Count > 0 ? found[0] : throw ExpertErrors.ExpertNotFound();
    }
}
