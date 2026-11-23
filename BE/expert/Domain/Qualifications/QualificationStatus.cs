namespace Caps.Expert.Domain.Qualifications;

/// <summary>Statuses of an Expert-Service Qualification (state model 4.2).</summary>
public static class QualificationStatus
{
    /// <summary>
    /// Registered; the expert gathers competency evidence and submits it (E1). Not in the reviewer queue yet.
    /// </summary>
    public const string Preparing = "PREPARING";

    /// <summary>Waiting for an authorized reviewer to assess C1–C5 for the service.</summary>
    public const string CompetencyReview = "COMPETENCY_REVIEW";
    public const string NeedMoreInformation = "NEED_MORE_INFORMATION";

    /// <summary>Gate 2 PASS; waiting for the System Admin governance check.</summary>
    public const string PendingFinalApproval = "PENDING_FINAL_APPROVAL";
    public const string ApprovedForService = "APPROVED_FOR_SERVICE";
    public const string Suspended = "SUSPENDED";

    /// <summary>Gate 2 FAIL: closed; registering the service again waits for the policy interval (BR-E22).</summary>
    public const string Fail = "FAIL";

    /// <summary>Every status except FAIL keeps the Expert-Service pair taken: only one such row may exist.</summary>
    public static bool IsClosed(string status) => status == Fail;
}

/// <summary>What a System Admin can decide at final approval.</summary>
public static class FinalApprovalDecision
{
    public const string Approve = "APPROVE";

    /// <summary>Missing records, unresolved flags or a process error: back to competency review.</summary>
    public const string ReturnForReview = "RETURN_FOR_REVIEW";
}

/// <summary>What a System Admin can do to an approved service (state model 4.2, rows 8–9).</summary>
public static class ServiceAccessAction
{
    /// <summary>Hide the service from the Marketplace; running cases continue.</summary>
    public const string Suspend = "SUSPEND";
    public const string Reinstate = "REINSTATE";
}
