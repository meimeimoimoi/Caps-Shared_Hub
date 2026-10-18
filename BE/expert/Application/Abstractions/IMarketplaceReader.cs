using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Read-only marketplace queries (projections, no tracking).</summary>
public interface IMarketplaceReader
{
    Task<IReadOnlyList<MarketplaceExpertItem>> SearchAsync(
        MarketplaceFilter filter,
        int skip,
        int take,
        CancellationToken ct
    );

    Task<MarketplaceExpertDetail?> FindAsync(Guid id, CancellationToken ct);
}
