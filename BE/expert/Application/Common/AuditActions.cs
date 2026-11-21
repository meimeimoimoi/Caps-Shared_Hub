namespace Caps.Expert.Application.Common;

/// <summary>Entity types and actions expert writes to the audit log. Released values are never renamed.</summary>
public static class AuditActions
{
    public const string Application = "EXPERT_APPLICATION";
    public const string Qualification = "EXPERT_QUALIFICATION";

    /// <summary>One change of one policy key; the entity id is the change's id.</summary>
    public const string Policy = "EXPERT_POLICY";

    public const string EligibilityDecided = "ELIGIBILITY_DECIDED";
    public const string CompetencyDecided = "COMPETENCY_DECIDED";
    public const string FinalApproved = "FINAL_APPROVED";
    public const string ReturnedForReview = "RETURNED_FOR_REVIEW";
    public const string ServiceSuspended = "SERVICE_SUSPENDED";
    public const string ServiceReinstated = "SERVICE_REINSTATED";
    public const string PolicyUpdated = "POLICY_UPDATED";

    /// <summary>One expert violation; the entity id is the review case id.</summary>
    public const string Violation = "EXPERT_VIOLATION";
    public const string ViolationExcused = "VIOLATION_EXCUSED";
}
