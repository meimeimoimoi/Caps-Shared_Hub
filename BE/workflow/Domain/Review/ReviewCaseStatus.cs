namespace Caps.Workflow.Domain.Review;

/// <summary>Review case statuses, stored as text; the cron indexes filter on these values.</summary>
public static class ReviewCaseStatus
{
    public const string PendingExpertResponse = "PENDING_EXPERT_RESPONSE";
    public const string ExpertDeclined = "EXPERT_DECLINED";
    public const string AwaitingPayment = "AWAITING_PAYMENT";
    public const string CancelledUnpaid = "CANCELLED_UNPAID";
    public const string ExpertTimeout = "EXPERT_TIMEOUT";
    public const string InReview = "IN_REVIEW";
    public const string AwaitingUserInformation = "AWAITING_USER_INFORMATION";
    public const string AwaitingAcceptance = "AWAITING_ACCEPTANCE";
    public const string Completed = "COMPLETED";
    public const string AutoConfirmed = "AUTO_CONFIRMED";
    public const string Terminated = "TERMINATED";
    public const string DeliveryOverdue = "DELIVERY_OVERDUE";
    public const string Disputed = "DISPUTED";
    public const string Resolved = "RESOLVED";
}
