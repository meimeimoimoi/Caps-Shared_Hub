namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>One row of the review queue: an eligibility application (GATE_1) or a service qualification (GATE_2).</summary>
/// <param name="Gate">GATE_1 for an eligibility application, GATE_2 for a service qualification.</param>
/// <param name="ServiceCode">Service of a qualification; null for an application.</param>
/// <param name="ServiceName">Catalog name of that service; null when unknown or for an application.</param>
/// <param name="IsReapplication">True when it follows an earlier rejection of the same kind.</param>
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
    bool IsReapplication
);

/// <summary>One page of the review queue, oldest submission first, with the number of matching rows.</summary>
public sealed record ReviewQueuePageResponse(
    ReviewQueueRowResponse[] Items,
    int Page,
    int PageSize,
    int Total
);

/// <summary>Rows per status, for tab counts and sidebar badges, without loading the rows.</summary>
public sealed record ReviewQueueCountsResponse(
    IReadOnlyDictionary<string, int> Applications,
    IReadOnlyDictionary<string, int> Qualifications
);
