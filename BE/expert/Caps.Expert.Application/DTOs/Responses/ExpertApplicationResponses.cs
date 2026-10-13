namespace Caps.Expert.Application.DTOs.Responses;

/// <param name="MissingRequirements">Still missing before submit: phone, yearsExperience, fields, CV.</param>
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
    string[] MissingRequirements,
    bool EmailVerified,
    bool CanEdit,
    bool CanUpload,
    bool CanSubmit,
    bool CanSupplement
);

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

public sealed record ExpertEvidenceResponse(
    string Id,
    string Code,
    string FileName,
    string ContentType,
    long SizeBytes,
    DateTimeOffset UploadedAt,
    bool CanRemove
);

public sealed record ExpertApplicationEventResponse(
    string? FromStatus,
    string ToStatus,
    string? Note,
    DateTimeOffset At,
    bool ByApplicant
);

public sealed record ExpertEvidenceFile(Stream Content, string ContentType, string FileName);
