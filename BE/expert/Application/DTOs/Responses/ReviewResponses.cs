namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>One application in the reviewer's queue.</summary>
/// <param name="IsReapplication">True when it follows an earlier closed application (BR-E23).</param>
public sealed record ReviewQueueItemResponse(
    string Id,
    string ApplicantUserId,
    string? DisplayName,
    int? YearsExperience,
    string[] Fields,
    string Status,
    DateTimeOffset? SubmittedAt,
    bool IsReapplication
);

/// <summary>The reviewer's view of an application: details, files, history and the latest Gate 1 results.</summary>
/// <param name="SuggestedExperienceResult">EV-06 result the declared years point to; the reviewer confirms it.</param>
/// <param name="CanDecide">True while the application waits for a Gate 1 decision.</param>
public sealed record ReviewApplicationResponse(
    string Id,
    string ApplicantUserId,
    string Status,
    DateTimeOffset? SubmittedAt,
    DateTimeOffset? DecidedAt,
    string? DecisionNote,
    DateTimeOffset? EarliestReapplyAt,
    string? PreviousApplicationId,
    DateTimeOffset CreatedAt,
    ReviewApplicantProfile Profile,
    ReviewEvidenceResponse[] Evidence,
    ReviewEventResponse[] History,
    EligibilityCheckResponse[] Eligibility,
    int MinYearsExperience,
    string SuggestedExperienceResult,
    bool CanDecide
);

/// <summary>Applicant details as entered in the application.</summary>
public sealed record ReviewApplicantProfile(
    string? DisplayName,
    string? Phone,
    DateOnly? BirthDate,
    string? Title,
    string? Company,
    string? Location,
    string? Bio,
    int? YearsExperience,
    string[] Fields,
    string? Highlights
);

/// <summary>One file of the application, without its content.</summary>
public sealed record ReviewEvidenceResponse(
    string Id,
    string Code,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTimeOffset UploadedAt
);

/// <summary>One status change, with who made it.</summary>
public sealed record ReviewEventResponse(
    string? FromStatus,
    string ToStatus,
    string? Note,
    DateTimeOffset At,
    string ActorUserId,
    bool ByApplicant
);

/// <summary>One requirement's result in the latest Gate 1 decision.</summary>
public sealed record EligibilityCheckResponse(
    string Code,
    string Result,
    string? Note,
    DateTimeOffset DecidedAt
);
