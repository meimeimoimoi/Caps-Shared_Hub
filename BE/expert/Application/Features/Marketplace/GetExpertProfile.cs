using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Marketplace;

/// <summary>The expert whose public profile is requested.</summary>
public sealed record GetExpertProfileQuery(Guid Id);

/// <summary>Returns the public profile of an approved, active expert.</summary>
public sealed class GetExpertProfileHandler(IMarketplaceReader marketplace)
    : IQueryHandler<GetExpertProfileQuery, MarketplaceExpertDetail>
{
    public async Task<MarketplaceExpertDetail> HandleAsync(
        GetExpertProfileQuery query,
        CancellationToken ct
    )
    {
        return await marketplace.FindAsync(query.Id, ct) ?? throw ExpertErrors.ExpertNotFound();
    }
}
