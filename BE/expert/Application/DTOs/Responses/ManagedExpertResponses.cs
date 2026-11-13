namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>One Expert–Service on the admin expert list; the id is the qualification id used by service-access.</summary>
/// <param name="Fee">Null while the expert has not priced the service.</param>
/// <param name="CompetencyReviewer">Email of the Gate 2 reviewer when known, otherwise their user id.</param>
public sealed record ManagedExpertResponse(
    string Id,
    string ApplicationId,
    string ExpertId,
    string? DisplayName,
    string? Email,
    int? YearsExperience,
    string[] Fields,
    string ServiceCode,
    string ServiceName,
    string Status,
    bool AcceptingRequests,
    long? Fee,
    int? TurnaroundHours,
    int Capacity,
    int ActiveCases,
    DateTimeOffset? ApprovedAt,
    string? CompetencyReviewer,
    ManagedExpertEventResponse[] History
);

/// <summary>A status change, newest first; Actor is the actor's email when known, otherwise their user id.</summary>
public sealed record ManagedExpertEventResponse(
    string Actor,
    string? FromStatus,
    string ToStatus,
    string? Note,
    DateTimeOffset At
);
