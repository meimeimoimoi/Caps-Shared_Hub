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
    bool IsReapplication,
    int OpenScreeningPoints = 0,
    string? ScreeningStatus = null
);

/// <summary>The reviewer's view of an application: details, files, history and the latest Gate 1 results.</summary>
/// <param name="SuggestedExperienceResult">EV-06 result the declared years point to; the reviewer confirms it.</param>
/// <param name="CanDecide">True while the application waits for a Gate 1 decision.</param>
/// <param name="Profile">Details from the snapshot of the latest submission (the live profile only for drafts).</param>
/// <param name="Submissions">Every submission, first one first, with the statements agreed to.</param>
/// <param name="NotApplicableCriteria">Criteria the reviewer may mark NOT_APPLICABLE (with a reason).</param>
/// <param name="CriterionDeclarations">
/// Statements of the latest submission that support a criterion (EV-04, EV-05), one entry per criterion and
/// statement, so the reviewer judges each criterion on the wording the applicant agreed to.
/// </param>
/// <param name="Rounds">Rounds of more information asked for so far; on the last round NEED_MORE_INFORMATION is refused.</param>
/// <param name="Claim">Who works on the application now and the claim history; decisions need an active claim.</param>
/// <param name="DeclarationPassedCriteria">
/// Criteria passed by an agreed statement of the latest submission (EV-04, EV-05). They pass by default with
/// a note saying so; a reviewer with grounds against the statement may send FAIL or NEED_MORE_INFORMATION
/// with a note instead.
/// </param>
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
    bool CanDecide,
    ReviewSubmissionResponse[] Submissions,
    string[] NotApplicableCriteria,
    CriterionDeclarationResponse[] CriterionDeclarations,
    string[] DeclarationPassedCriteria,
    ReviewClaimStateResponse Claim,
    InformationRoundsResponse Rounds,
    ReviewScreeningResponse? Screening = null
);

/// <summary>A statement the applicant agreed to, shown under the criterion it supports.</summary>
/// <param name="AgreedAt">Time of the submission that recorded the statement.</param>
public sealed record CriterionDeclarationResponse(
    string Criterion,
    string Code,
    string Language,
    string Text,
    DateTimeOffset AgreedAt,
    string AgreedByUserId
);

/// <summary>One submission (first submit or supplement) with the statements agreed to.</summary>
public sealed record ReviewSubmissionResponse(
    int Number,
    DateTimeOffset SubmittedAt,
    DeclarationResponse[] Declarations
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
    DateTimeOffset UploadedAt,
    string? SourceUrl = null
);

/// <summary>One status change, with who made it.</summary>
/// <param name="BySystem">Made by the system itself, not by a person (see SystemActor).</param>
public sealed record ReviewEventResponse(
    string? FromStatus,
    string ToStatus,
    string? Note,
    DateTimeOffset At,
    string ActorUserId,
    bool ByApplicant,
    bool BySystem = false
);

/// <summary>One requirement's result in the latest Gate 1 decision.</summary>
/// <param name="AppliedMinYearsExperience">EV-06 minimum years in force when decided; null for older decisions.</param>
public sealed record EligibilityCheckResponse(
    string Code,
    string Result,
    string? Note,
    DateTimeOffset DecidedAt,
    int? AppliedMinYearsExperience = null
);

/// <summary>Latest Gate 1 screening run with its points, per-file extractions and internal history.</summary>
public sealed record ReviewScreeningResponse(
    string RunId,
    int SubmissionNumber,
    int RunNumber,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset TimeoutAt,
    DateTimeOffset? CompletedAt,
    string? FailureReason,
    int CheckedFileCount,
    int OpenPointCount,
    bool CanRetry,
    bool VisionEnabled,
    ReviewScreeningPointResponse[] Points,
    ReviewScreeningExtractionResponse[] Extractions,
    ReviewScreeningHistoryResponse[] History
);

/// <summary>One discrepancy or check point raised by AI or system rules for reviewer handling.</summary>
public sealed record ReviewScreeningPointResponse(
    string Id,
    string Source,
    string Code,
    string? EvidenceId,
    string? EvidenceCode,
    string? FileName,
    string? TargetCriterion,
    string Title,
    string Detail,
    string? SuggestedRequest,
    string Status,
    string? ResolutionReason,
    string? ResolvedByUserId,
    DateTimeOffset? ResolvedAt,
    DateTimeOffset CreatedAt
);

/// <summary>One non-EV-01 evidence file's extracted Section 1 fields (never raw file content).</summary>
public sealed record ReviewScreeningExtractionResponse(
    string EvidenceId,
    string EvidenceCode,
    string FileName,
    string? AssignedGroup,
    string ExtractionStatus,
    bool IsImage,
    bool IsScanned,
    bool IsUnreadable,
    string? UnreadableReason,
    string? FullName,
    string? DocumentType,
    string[] FieldCodes,
    double? DerivedTaxYears,
    ReviewScreeningMilestoneResponse[] WorkMilestones,
    ReviewScreeningCertificateResponse[] Certificates,
    DateTimeOffset? ExtractedAt
);

/// <summary>One work milestone extracted from a CV or professional document.</summary>
public sealed record ReviewScreeningMilestoneResponse(
    string? Company,
    string? Role,
    int? StartYear,
    int? StartMonth,
    int? EndYear,
    int? EndMonth,
    bool IsCurrent,
    bool IsTaxAccounting
);

/// <summary>One certificate entry extracted from a CV or certificate file.</summary>
public sealed record ReviewScreeningCertificateResponse(
    string? Name,
    string? Issuer,
    DateOnly? IssuedDate,
    DateOnly? ExpiryDate
);

/// <summary>One internal screening timeline event visible only to reviewers and system admins.</summary>
public sealed record ReviewScreeningHistoryResponse(
    string Id,
    string EventType,
    string Message,
    string ActorUserId,
    bool BySystem,
    DateTimeOffset At
);
