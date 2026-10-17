namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>One expert card in the marketplace list.</summary>
public sealed record MarketplaceExpertItem(
    Guid Id,
    string? DisplayName,
    string? Title,
    string[] Fields,
    int? YearsExperience,
    decimal RatingAvg,
    int RatingCount,
    long? MinFee
);

/// <summary>A page of experts; HasMore avoids a COUNT(*) on every request.</summary>
public sealed record MarketplacePage(
    IReadOnlyList<MarketplaceExpertItem> Items,
    int Page,
    bool HasMore
);

/// <summary>One service package an expert sells.</summary>
public sealed record MarketplaceOffering(Guid Id, string ServiceType, long Fee);

/// <summary>Public profile of one expert: details, rating and active service packages.</summary>
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
    int? TurnaroundHours,
    decimal RatingAvg,
    int RatingCount,
    IReadOnlyList<MarketplaceOffering> Offerings
);
