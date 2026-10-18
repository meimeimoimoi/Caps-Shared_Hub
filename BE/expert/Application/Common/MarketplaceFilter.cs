using System.Text.Json.Serialization;

namespace Caps.Expert.Application.Common;

/// <summary>How the client orders the marketplace list.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum MarketplaceSort
{
    /// <summary>Experts with a free slot and VERIFIED ≥ 80% first, then by rating.</summary>
    Recommended,
    Rating,
    Price,
    Turnaround,
}

/// <summary>Everything the client can search and filter the marketplace by.</summary>
public sealed record MarketplaceFilter(
    string? Keyword,
    string? Field,
    string? ServiceType,
    bool OpenOnly,
    int? MaxTurnaroundHours,
    MarketplaceSort Sort
);
