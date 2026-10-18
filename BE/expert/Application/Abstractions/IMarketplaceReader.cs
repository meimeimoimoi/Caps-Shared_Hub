using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Abstractions;

/// <summary>Read-only marketplace queries (projections, no tracking).</summary>
public interface IMarketplaceReader
{
    Task<IReadOnlyList<MarketplaceExpertItem>> SearchAsync(
        string? keyword,
        string? field,
        int skip,
        int take,
        CancellationToken ct
    );

    Task<MarketplaceExpertDetail?> FindAsync(Guid id, CancellationToken ct);
}
