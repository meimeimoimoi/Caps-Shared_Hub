namespace Caps.Expert.Application.DTOs.Responses;

/// <summary>The expert's prices for one approved service: every version, the audit trail and the policy.</summary>
/// <param name="Revision">Send it back when saving; a different value means someone changed the prices meanwhile.</param>
/// <param name="AutoApproveMaxChangePercent">Changes up to this percent from the price in effect are approved at once.</param>
/// <param name="CanEdit">The service is approved and no change is waiting for a System Admin.</param>
public sealed record PricingWorkspaceResponse(
    string QualificationId,
    string ServiceCode,
    string ServiceName,
    int Revision,
    long MinPrice,
    long MaxPrice,
    int AutoApproveMaxChangePercent,
    bool CanEdit,
    ServicePricingResponse[] Versions,
    PricingAuditResponse[] Audit
);

/// <summary>One Pricing Version.</summary>
/// <param name="ChangePercent">Change from the price in effect at submission; null for the first price.</param>
/// <param name="ReviewNote">The System Admin's note when returned, rejected or approved with a note.</param>
public sealed record ServicePricingResponse(
    string Id,
    int Sequence,
    long Amount,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo,
    string? Reason,
    string Status,
    bool AutoApproved,
    int? ChangePercent,
    string? ReviewNote,
    DateTimeOffset? SubmittedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

/// <summary>One audit entry; Actor is EXPERT, ADMIN or SYSTEM.</summary>
public sealed record PricingAuditResponse(
    string VersionId,
    string Action,
    DateTimeOffset At,
    string Actor,
    string? Note
);

/// <summary>A price change waiting for (or decided by) a System Admin.</summary>
/// <param name="CurrentAmount">The latest approved price the change is measured against.</param>
public sealed record PricingReviewItemResponse(
    string Id,
    string QualificationId,
    string ExpertUserId,
    string? DisplayName,
    string ServiceCode,
    int Sequence,
    long Amount,
    long? CurrentAmount,
    int? ChangePercent,
    DateOnly EffectiveFrom,
    string? Reason,
    string Status,
    DateTimeOffset? SubmittedAt,
    string? DecisionNote
);
