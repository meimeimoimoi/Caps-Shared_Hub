namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>One row of the review queue: an eligibility application (GATE_1) or a service qualification (GATE_2).</summary>
/// <param name="Gate">GATE_1 for an eligibility application, GATE_2 for a service qualification.</param>
/// <param name="ServiceCode">Service of a qualification; null for an application.</param>
/// <param name="ServiceName">Catalog name of that service; null when unknown or for an application.</param>
/// <param name="IsReapplication">True when it follows an earlier rejection of the same kind.</param>
/// <param name="ClaimedByUserId">Reviewer holding it now; null when nobody does (or the claim expired).</param>
/// <param name="ClaimedByEmail">That reviewer's email as last seen; null when unknown.</param>
/// <param name="ClaimExpiresAt">When the claim lapses; null while waiting for the expert or when free.</param>
/// <param name="HeldByMe">True when the caller holds it.</param>
public sealed record ReviewQueueRowResponse(
    string Id,
    string Gate,
    string ApplicantUserId,
    string? DisplayName,
    int? YearsExperience,
    string[] Fields,
    string? ServiceCode,
    string? ServiceName,
    string Status,
    DateTimeOffset? SubmittedAt,
    bool IsReapplication,
    string? ClaimedByUserId = null,
    string? ClaimedByEmail = null,
    DateTimeOffset? ClaimExpiresAt = null,
    bool HeldByMe = false
);

/// <summary>One page of the review queue, oldest submission first, with the number of matching rows.</summary>
/// <param name="SlaDays">Days a review may wait before it is flagged (policy ReviewSlaDays).</param>
public sealed record ReviewQueuePageResponse(
    ReviewQueueRowResponse[] Items,
    int Page,
    int PageSize,
    int Total,
    int SlaDays
);

/// <summary>Rows per status, for tab counts and sidebar badges, without loading the rows.</summary>
/// <param name="AvailableApplications">Per status, only those held by the caller or by nobody.</param>
/// <param name="AvailableQualifications">Per status, only those held by the caller or by nobody.</param>
/// <param name="SlaDays">Days a review may wait before it is flagged (policy ReviewSlaDays).</param>
public sealed record ReviewQueueCountsResponse(
    IReadOnlyDictionary<string, int> Applications,
    IReadOnlyDictionary<string, int> Qualifications,
    IReadOnlyDictionary<string, int> AvailableApplications,
    IReadOnlyDictionary<string, int> AvailableQualifications,
    int SlaDays
);
