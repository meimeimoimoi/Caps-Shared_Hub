using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Common;

/// <summary>Builds the public Marketplace listing from qualifications, prices, slots and account status.</summary>
public interface IMarketplaceListing
{
    /// <summary>Listed experts, best rated first, then the soonest open slot.</summary>
    /// <param name="serviceCode">Only experts bookable for this service; null for any service.</param>
    /// <param name="profileId">Only this expert; null for every expert.</param>
    Task<IReadOnlyList<MarketplaceExpertResponse>> ListAsync(
        string? serviceCode,
        Guid? profileId,
        CancellationToken ct
    );
}
