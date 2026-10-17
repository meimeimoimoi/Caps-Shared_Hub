namespace Caps.Expert.Domain.Applications;

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

    /// <summary>Closed application: applying again requires a new Application (BR-E23).</summary>
    public static bool IsClosed(string status) => status is NotEligible or Rejected or Approved;
}
