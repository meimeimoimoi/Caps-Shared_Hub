using Caps.Common.Domain;

namespace Caps.Expert.Domain.Applications;

/// <summary>Whether a screening point came from deterministic system rules or AI extraction comparison.</summary>
public static class ScreeningPointSources
{
    public const string Ai = "AI";
    public const string System = "SYSTEM";
}

/// <summary>Catalog of screening point codes from Sections 2, 3 and 4 of the CV screening checklist.</summary>
public static class ScreeningPointCodes
{
    public const string AiNameMismatch = "AI_NAME_MISMATCH";
    public const string AiExperienceMismatch = "AI_EXPERIENCE_MISMATCH";
    public const string AiDocTypeMismatch = "AI_DOC_TYPE_MISMATCH";
    public const string AiCertificateExpired = "AI_CERTIFICATE_EXPIRED";
    public const string AiMissingFields = "AI_MISSING_FIELDS";

    public const string SysUnreadableOrScan = "SYS_UNREADABLE_OR_SCAN";
    public const string SysExternalLink = "SYS_EXTERNAL_LINK";
    public const string SysNearMinExperience = "SYS_NEAR_MIN_EXPERIENCE";
    public const string SysUnclassifiedSupplement = "SYS_UNCLASSIFIED_SUPPLEMENT";
    public const string SysAiScreeningFailed = "SYS_AI_SCREENING_FAILED";
}

/// <summary>Resolution status of one screening point; all open points must be resolved before Gate 1 decision.</summary>
public static class ScreeningPointStatuses
{
    public const string Open = "OPEN";
    public const string Checked = "CHECKED";
    public const string UsedForSupplement = "USED_FOR_SUPPLEMENT";
}

/// <summary>Reviewer actions on a screening point.</summary>
public static class ScreeningPointActions
{
    public const string Checked = "CHECKED";
    public const string UsedForSupplement = "USED_FOR_SUPPLEMENT";
    public const string Reopen = "REOPEN";
}

/// <summary>
/// One discrepancy or review attention point generated during Gate 1 screening.
/// Reviewers must resolve every open point before recording a Gate 1 decision.
/// </summary>
public sealed class ScreeningPoint
{
    public const int MaxReasonLength = 1000;

    private ScreeningPoint() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ScreeningRunId { get; private set; }
    public Guid ApplicationId { get; private set; }
    public Guid? EvidenceId { get; private set; }
    public string Source { get; private set; } = default!;
    public string Code { get; private set; } = default!;
    public string? TargetCriterion { get; private set; }
    public string Title { get; private set; } = default!;
    public string Detail { get; private set; } = default!;
    public string? SuggestedRequest { get; private set; }
    public string? MetadataJson { get; private set; }
    public string Status { get; private set; } = ScreeningPointStatuses.Open;
    public string? ResolutionReason { get; private set; }
    public Guid? ResolvedByUserId { get; private set; }
    public DateTimeOffset? ResolvedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public bool IsOpen => Status == ScreeningPointStatuses.Open;

    /// <summary>Creates a new open screening point belonging to a run.</summary>
    public static ScreeningPoint Create(
        Guid screeningRunId,
        Guid applicationId,
        Guid? evidenceId,
        string source,
        string code,
        string? targetCriterion,
        string title,
        string detail,
        string? suggestedRequest,
        string? metadataJson,
        DateTimeOffset now
    ) =>
        new()
        {
            ScreeningRunId = screeningRunId,
            ApplicationId = applicationId,
            EvidenceId = evidenceId,
            Source = source,
            Code = code,
            TargetCriterion = targetCriterion,
            Title = title,
            Detail = detail,
            SuggestedRequest = suggestedRequest,
            MetadataJson = metadataJson,
            Status = ScreeningPointStatuses.Open,
            CreatedAt = now,
        };

    /// <summary>Marks the point as checked by the reviewer with a mandatory explanation.</summary>
    public void MarkChecked(Guid reviewerUserId, string? reason, DateTimeOffset now)
    {
        var cleaned = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (cleaned == null)
            throw ExpertErrors.ScreeningPointReasonRequired();
        if (cleaned.Length > MaxReasonLength)
            throw ExpertErrors.ScreeningPointReasonTooLong(MaxReasonLength);

        Status = ScreeningPointStatuses.Checked;
        ResolutionReason = cleaned;
        ResolvedByUserId = reviewerUserId;
        ResolvedAt = now;
    }

    /// <summary>Marks the point as used to ask the applicant for more information.</summary>
    public void UseForSupplement(Guid reviewerUserId, string? reason, DateTimeOffset now)
    {
        var cleaned = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (cleaned?.Length > MaxReasonLength)
            throw ExpertErrors.ScreeningPointReasonTooLong(MaxReasonLength);

        Status = ScreeningPointStatuses.UsedForSupplement;
        ResolutionReason = cleaned;
        ResolvedByUserId = reviewerUserId;
        ResolvedAt = now;
    }

    /// <summary>Reopens a previously resolved point so the reviewer can revise its handling before Gate 1.</summary>
    public void Reopen()
    {
        Status = ScreeningPointStatuses.Open;
        ResolutionReason = null;
        ResolvedByUserId = null;
        ResolvedAt = null;
    }
}
