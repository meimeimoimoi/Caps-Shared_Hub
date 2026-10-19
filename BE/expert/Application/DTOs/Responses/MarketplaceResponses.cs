namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>One expert card in the marketplace list.</summary>
/// <param name="VerifiedRate">Percent of delivered cases VERIFIED; null until the expert has enough cases.</param>
/// <param name="TurnaroundHours">Delivery time of the chosen service, or the fastest one when no service is chosen.</param>
/// <param name="Fee">Price of the chosen service, or the lowest price when no service is chosen.</param>
/// <param name="Available">Takes new cases and has a free slot now.</param>
public sealed record MarketplaceExpertItem(
    Guid Id,
    string? DisplayName,
    string? Title,
    string[] Fields,
    int? YearsExperience,
    decimal RatingAvg,
    int RatingCount,
    int? VerifiedRate,
    int? TurnaroundHours,
    long? Fee,
    bool Available
);

/// <summary>A page of experts; HasMore avoids a COUNT(*) on every request.</summary>
public sealed record MarketplacePage(
    IReadOnlyList<MarketplaceExpertItem> Items,
    int Page,
    bool HasMore
);

/// <summary>One service package an expert sells, with its price and delivery time in hours.</summary>
public sealed record MarketplaceOffering(
    Guid Id,
    string ServiceType,
    long Fee,
    int TurnaroundHours
);

/// <summary>Public profile of one expert: details, rating and active service packages (each with its own delivery time).</summary>
public sealed record MarketplaceExpertDetail(
    Guid Id,
    string? DisplayName,
    string? Title,
    string? Company,
    string? Location,
    string? Bio,
    string[] Fields,
    int? YearsExperience,
    string? Highlights,
    decimal RatingAvg,
    int RatingCount,
    IReadOnlyList<MarketplaceOffering> Offerings,
    bool Available,
    int? VerifiedRate
);
