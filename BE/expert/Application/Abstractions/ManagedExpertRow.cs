namespace Caps.Expert.Application.Abstractions;

/// <summary>One approved or suspended Expert–Service with the expert's profile, price and load.</summary>
/// <param name="ApprovedAt">When the qualification first reached APPROVED_FOR_SERVICE.</param>
/// <param name="Fee">Null while the expert has not priced the service.</param>
public sealed record ManagedExpertRow(
    Guid QualificationId,
    Guid ApplicationId,
    Guid ExpertProfileId,
    Guid ExpertUserId,
    string? DisplayName,
    string? Email,
    int? YearsExperience,
    string[] Fields,
    string ServiceCode,
    string Status,
    bool AcceptingRequests,
    long? Fee,
    int? TurnaroundHours,
    int Capacity,
    int ActiveCases,
    DateTimeOffset? ApprovedAt,
    Guid? CompetencyReviewerUserId,
    IReadOnlyList<ManagedExpertEventRow> Events
);

/// <summary>One status change of the qualification, oldest first.</summary>
public sealed record ManagedExpertEventRow(
    Guid ActorUserId,
    string? FromStatus,
    string ToStatus,
    string? Note,
    DateTimeOffset At
);
