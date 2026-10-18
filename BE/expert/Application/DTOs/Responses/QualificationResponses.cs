namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>The services an expert can register for and where each one stands (Gate 2).</summary>
/// <param name="EligibilityStatus">Status of the latest Gate 1 application; null when none exists.</param>
/// <param name="Eligible">Gate 1 passed: services can be registered (BR-E07).</param>
public sealed record ExpertQualificationsResponse(
    string? EligibilityStatus,
    bool Eligible,
    ServiceQualificationSummary[] Services
);

/// <summary>One active catalog service with the expert's latest qualification for it.</summary>
/// <param name="QualificationId">Latest qualification of this service; null before the first registration.</param>
/// <param name="EarliestReapplyAt">After FAIL: when the service can be registered again.</param>
/// <param name="CanRegister">True when a new qualification can be opened now.</param>
public sealed record ServiceQualificationSummary(
    string ServiceCode,
    string ServiceName,
    string? QualificationId,
    string? Status,
    DateTimeOffset? SubmittedAt,
    DateTimeOffset? EarliestReapplyAt,
    bool CanRegister
);

/// <summary>The expert's view of one qualification: files, history, results and the actions allowed now.</summary>
/// <param name="Competencies">Per-competency results of the latest decision: what to supplement or why it was not met.</param>
/// <param name="MaxFiles">Files that can be added for this service.</param>
public sealed record ExpertQualificationResponse(
    string Id,
    string ServiceCode,
    string ServiceName,
    string Status,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? DecidedAt,
    string? DecisionNote,
    DateTimeOffset? EarliestReapplyAt,
    string? PreviousQualificationId,
    DateTimeOffset CreatedAt,
    ExpertEvidenceResponse[] Evidence,
    ExpertApplicationEventResponse[] History,
    CompetencyResultResponse[] Competencies,
    bool CanUpload,
    bool CanSupplement,
    int MaxFiles
);

/// <summary>One competency's result in the latest Gate 2 decision.</summary>
/// <param name="EvidenceIds">Files the reviewer cited for this result.</param>
public sealed record CompetencyResultResponse(
    string Code,
    string Result,
    string Note,
    string[] EvidenceIds,
    DateTimeOffset DecidedAt
);

/// <summary>One qualification in the reviewer's Gate 2 queue.</summary>
/// <param name="IsReapplication">True when it follows an earlier FAIL for the same service (BR-E23).</param>
public sealed record QualificationQueueItemResponse(
    string Id,
    string ApplicantUserId,
    string? DisplayName,
    int? YearsExperience,
    string[] Fields,
    string ServiceCode,
    string Status,
    DateTimeOffset SubmittedAt,
    bool IsReapplication
);

/// <summary>
/// The reviewer's view of a qualification: the expert's details, every file it can rely on, its history,
/// the Gate 1 results it builds on and the latest Gate 2 results.
/// </summary>
/// <param name="ApplicationId">The ELIGIBLE Gate 1 application the qualification relies on.</param>
/// <param name="CanDecide">True while the qualification waits for a Gate 2 decision.</param>
public sealed record ReviewQualificationResponse(
    string Id,
    string ApplicantUserId,
    string ServiceCode,
    string ServiceName,
    string Status,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? DecidedAt,
    string? DecisionNote,
    DateTimeOffset? EarliestReapplyAt,
    string? PreviousQualificationId,
    string ApplicationId,
    DateTimeOffset CreatedAt,
    ReviewApplicantProfile Profile,
    ReviewEvidenceResponse[] Evidence,
    ReviewEventResponse[] History,
    EligibilityCheckResponse[] Eligibility,
    CompetencyResultResponse[] Competencies,
    bool CanDecide
);
