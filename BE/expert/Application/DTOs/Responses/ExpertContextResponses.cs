namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>
/// What the signed-in account can do in the Expert Portal. The server is authoritative: the client maps
/// menu items and pages to <see cref="PortalAccessResponse.Capabilities"/> and never derives them itself.
/// </summary>
/// <param name="ExpertId">Expert profile id; null before the first application is saved.</param>
/// <param name="Stage">APPLICATION, SERVICE_SETUP or ACTIVE.</param>
/// <param name="ApplicationStatus">Status of the latest application; null when none exists.</param>
/// <param name="Phone">Contact phone of the expert profile; null before it is saved.</param>
public sealed record ExpertContextResponse(
    string? ExpertId,
    string DisplayName,
    string Email,
    string AccountStatus,
    string Stage,
    string? ApplicationStatus,
    PortalAccessResponse PortalAccess,
    ServiceReadinessResponse[] Services,
    DateTimeOffset GeneratedAt,
    string Version,
    string? Phone = null
);

/// <summary>Portal entry and the capabilities granted now.</summary>
public sealed record PortalAccessResponse(bool Allowed, string? Reason, string[] Capabilities);

/// <summary>One catalog service and how far the expert is from taking bookings for it.</summary>
/// <param name="QualificationStatus">Expert-Service qualification status; null until one exists (Gate 2).</param>
/// <param name="Reasons">Codes explaining why bookings are not allowed yet, e.g. ELIGIBILITY_PENDING.</param>
public sealed record ServiceReadinessResponse(
    string ServiceId,
    string ServiceName,
    string? QualificationStatus,
    string ServiceStatus,
    bool Availability,
    bool BookingAllowed,
    string[] Reasons,
    PricingVersionResponse? Pricing,
    string? PendingPricingVersion
);

/// <summary>The approved price version in effect.</summary>
public sealed record PricingVersionResponse(
    string Version,
    DateTimeOffset EffectiveFrom,
    DateTimeOffset? EffectiveTo
);
