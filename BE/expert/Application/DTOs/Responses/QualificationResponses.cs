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
/// <param name="AwaitsNewEvidence">Re-registration after FAIL: a new file is required before it is reviewed (BR-E22).</param>
/// <param name="CanSubmit">PREPARING with at least one file tied to a competency: it can be sent for review (E5).</param>
/// <param name="Submitted">Per competency C1…C5: the expert's description and the files tied to it.</param>
/// <param name="NewEvidenceRequiredFor">Re-registration after FAIL: failed competencies still without a new file (E7).</param>
/// <param name="Rounds">Rounds of more information asked for so far and the limit.</param>
/// <param name="ExpectedResultBy">
/// While under review: when a result is expected, from the Gate 2 waiting time and then the final approval due
/// time (D8); null otherwise.
/// </param>
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
    int MaxFiles,
    bool AwaitsNewEvidence,
    bool CanSubmit,
    CompetencySubmissionResponse[] Submitted,
    string[] NewEvidenceRequiredFor,
    InformationRoundsResponse Rounds,
    DateTimeOffset? ExpectedResultBy = null
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
/// <param name="ServiceName">Catalog name shown to reviewers; null when the service is no longer active.</param>
public sealed record QualificationQueueItemResponse(
    string Id,
    string ApplicantUserId,
    string? DisplayName,
    int? YearsExperience,
    string[] Fields,
    string ServiceCode,
    string Status,
    DateTimeOffset SubmittedAt,
    bool IsReapplication,
    string? ServiceName = null
);

/// <summary>
/// The reviewer's view of a qualification: the expert's details, every file it can rely on, its history,
/// the Gate 1 results it builds on and the latest Gate 2 results.
/// </summary>
/// <param name="ApplicationId">The ELIGIBLE Gate 1 application the qualification relies on.</param>
/// <param name="CanDecide">True while the qualification waits for a Gate 2 decision.</param>
/// <param name="CompetencyReviewerUserId">Who passed Gate 2; they cannot give the final approval (BR-E33).</param>
/// <param name="CanFinalApprove">True while the qualification waits for the System Admin final approval.</param>
/// <param name="CanSuspend">Approved: a System Admin can suspend the service.</param>
/// <param name="CanReinstate">Suspended: a System Admin can reinstate the service.</param>
/// <param name="Claim">Who works on the Gate 2 review now and the claim history; decisions need an active claim.</param>
/// <param name="Submitted">Per competency C1…C5: the expert's description and the files tied to it (E8, M7).</param>
/// <param name="Rounds">Rounds of more information asked for so far; on the last round NEED_MORE_INFORMATION is refused.</param>
/// <param name="FinalApprovalDueAt">While waiting for final approval: when it is due (D8); null otherwise.</param>
/// <param name="LastReturn">The return from final approval the Gate 2 reviewer still has to act on; null otherwise.</param>
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
    bool CanDecide,
    string? CompetencyReviewerUserId,
    bool CanFinalApprove,
    bool CanSuspend,
    bool CanReinstate,
    ReviewClaimStateResponse Claim,
    CompetencySubmissionResponse[] Submitted,
    InformationRoundsResponse Rounds,
    DateTimeOffset? FinalApprovalDueAt = null,
    FinalApprovalReturnResponse? LastReturn = null
);

/// <summary>A System Admin's return of a Gate 2 PASS to the reviewer, with the required reason.</summary>
/// <param name="ActorEmail">The admin's email as last seen; null when unknown.</param>
public sealed record FinalApprovalReturnResponse(
    string? Note,
    string ActorUserId,
    string? ActorEmail,
    DateTimeOffset At
);
