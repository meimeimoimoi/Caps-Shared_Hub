namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>The applicant's view of their application: details, files, history and the actions allowed now.</summary>
/// <param name="MissingRequirements">Still missing before submit: phone, yearsExperience, fields, CV.</param>
/// <param name="MaxFiles">Files the application may hold.</param>
/// <param name="Eligibility">Per-requirement results of the latest Gate 1 decision: what to supplement or why it was not met (BR-E28).</param>
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
    int MaxFiles
);

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
