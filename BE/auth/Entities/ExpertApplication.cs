using Caps.Common.Database;

namespace auth.Entities;

/// <summary>
/// Một lần nộp Expert Eligibility Application (Gate 1). Nộp lại sau NOT_ELIGIBLE/REJECTED phải tạo
/// dòng mới liên kết dòng cũ (BR-E23), không ghi đè kết quả lịch sử.
/// </summary>
public sealed class ExpertApplication
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; set; }
    public ExpertProfile ExpertProfile { get; set; } = default!;

    /// <summary>Theo ExpertApplicationStatus.</summary>
    public string Status { get; set; } = ExpertApplicationStatus.Draft;

    /// <summary>Lần nộp gần nhất (nộp đầu hoặc gửi bổ sung); lịch sử đầy đủ ở Events.</summary>
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

/// <summary>Trùng tên với APPLICATION_STATUS ở FE (màn duyệt của admin).</summary>
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
