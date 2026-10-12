using Caps.Common.Domain;

namespace Caps.Auth.Domain.Experts;

/// <summary>
/// One Expert Eligibility Application submission (Gate 1). Re-applying after NOT_ELIGIBLE/REJECTED
/// creates a new row linked to the previous one (BR-E23); past results are never overwritten.
/// </summary>
public sealed class ExpertApplication
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; set; }
    public ExpertProfile ExpertProfile { get; set; } = default!;

    /// <summary>Theo ExpertApplicationStatus.</summary>
    public string Status { get; set; } = ExpertApplicationStatus.Draft;

    /// <summary>Latest submission (first submit or supplement); full history is in Events.</summary>
    public DateTimeOffset? SubmittedAt { get; set; }
    public DateTimeOffset? DecidedAt { get; set; }
    public string? DecisionNote { get; set; }
    public Guid? PreviousApplicationId { get; set; }
    public ExpertApplication? PreviousApplication { get; set; }
    public DateTimeOffset? EarliestReapplyAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<ExpertEvidence> Evidences { get; set; } = new List<ExpertEvidence>();
    public ICollection<ExpertApplicationEvent> Events { get; set; } =
        new List<ExpertApplicationEvent>();
}

/// <summary>Same names as APPLICATION_STATUS in the FE (admin review screen).</summary>
public static class ExpertApplicationStatus
{
    public const string Draft = "DRAFT";
    public const string Submitted = "SUBMITTED";
    public const string AiScreening = "AI_SCREENING";
    public const string NeedMoreInformation = "NEED_MORE_INFORMATION";
    public const string NotEligible = "NOT_ELIGIBLE";
    public const string CapabilityReview = "CAPABILITY_REVIEW";
    public const string Approved = "APPROVED";
    public const string Rejected = "REJECTED";
}
