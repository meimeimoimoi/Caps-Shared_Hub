namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>
/// A listed expert (BR-M01): public profile, the services they can be booked for with the approved price,
/// and their next open slot. Evidence and CV are never public.
/// </summary>
public sealed record MarketplaceExpertResponse(
    string ExpertId,
    string? DisplayName,
    string? Title,
    string? Company,
    string? Location,
    int? YearsExperience,
    string[] Fields,
    string? Bio,
    string? Highlights,
    decimal RatingAvg,
    int RatingCount,
    MarketplaceServiceResponse[] Services,
    DateTimeOffset? NextOpenSlotAt,
    int OpenSlotCount
);

/// <summary>One bookable service of a listed expert.</summary>
/// <param name="Price">The expert's own price for the service; snapshotted on the case.</param>
/// <param name="SlaHours">Delivery time in hours from accepting the case, set by the expert.</param>
/// <param name="ApprovedAt">When the service was approved (final approval).</param>
public sealed record MarketplaceServiceResponse(
    string ServiceCode,
    string ServiceName,
    long Price,
    int SlaHours,
    DateTimeOffset? ApprovedAt
);
