namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>The applicant's view of their application: details, files, history and the actions allowed now.</summary>
/// <param name="MissingRequirements">
/// Still missing before submit: phone, yearsExperience, fields, then each required evidence group without a
/// file or link (e.g. CV, EV-01, EV-02).
/// </param>
/// <param name="MaxFiles">Files the application may hold.</param>
/// <param name="RequiredEvidence">Evidence groups that must hold a file or link before submitting.</param>
/// <param name="Declarations">
/// Statements to agree to when submitting, in every language; the client shows the wording of its language
/// and sends back only the codes and the language.
/// </param>
/// <param name="Eligibility">Per-requirement results of the latest Gate 1 decision: what to supplement or why it was not met (BR-E28).</param>
/// <param name="MinYearsExperience">EV-06 minimum years in force now.</param>
/// <param name="ChangesRequired">
/// Re-application after NOT_ELIGIBLE: criteria that failed before and still need updated information or new
/// evidence before submitting (POL-EXP-REAPP); empty otherwise.
/// </param>
public sealed record ExpertApplicationResponse(
    string Id,
    string Status,
    DateTimeOffset? SubmittedAt,
    DateTimeOffset? DecidedAt,
    string? DecisionNote,
    DateTimeOffset? EarliestReapplyAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    ExpertApplicationProfile Profile,
    ExpertEvidenceResponse[] Evidence,
    ExpertApplicationEventResponse[] History,
    EligibilityCheckResponse[] Eligibility,
    string[] MissingRequirements,
    bool EmailVerified,
    bool CanEdit,
    bool CanUpload,
    bool CanSubmit,
    bool CanSupplement,
    int MaxFiles,
    string[] RequiredEvidence,
    DeclarationResponse[] Declarations,
    int MinYearsExperience,
    string[] ChangesRequired,
    InformationRoundsResponse Rounds
);

/// <summary>One statement as shown to the applicant, or as recorded on a submission.</summary>
public sealed record DeclarationResponse(string Code, string Language, string Text);

/// <summary>The applicant details shown in the application form.</summary>
public sealed record ExpertApplicationProfile(
    string DisplayName,
    string Email,
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

/// <summary>One uploaded file, without its content.</summary>
public sealed record ExpertEvidenceResponse(
    string Id,
    string Code,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTimeOffset UploadedAt,
    bool CanRemove,
    string? SourceUrl = null
);

/// <summary>One status change in the application's history.</summary>
public sealed record ExpertApplicationEventResponse(
    string? FromStatus,
    string ToStatus,
    string? Note,
    DateTimeOffset At,
    bool ByApplicant
);

/// <summary>File content streamed back to its owner.</summary>
public sealed record ExpertEvidenceFile(Stream Content, string ContentType, string FileName);
