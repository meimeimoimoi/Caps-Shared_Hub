using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.Domain.Portal;

/// <summary>
/// What an account may open in the Expert Portal. The server decides; the client only maps each menu
/// item to a capability, so the unlock rules live in one place whatever the number of services.
/// </summary>
public static class PortalCapabilities
{
    /// <summary>The expert application and its review progress: every signed-in account.</summary>
    public const string Application = "application.view";

    /// <summary>Service pricing, availability and the public profile: after a service is approved.</summary>
    public const string ServicesManage = "services.manage";
    public const string PublicProfile = "profile.public";

    /// <summary>Review cases, the work queue and income: once a service can take bookings.</summary>
    public const string CasesWork = "cases.work";
    public const string IncomeView = "income.view";
}

/// <summary>Where the account stands in the expert journey (BR-E01: an account alone grants nothing).</summary>
public static class PortalStage
{
    /// <summary>Applying or under review (Gate 1, Gate 2, final approval).</summary>
    public const string Application = "APPLICATION";

    /// <summary>Approved for at least one service; pricing or availability still to set up.</summary>
    public const string ServiceSetup = "SERVICE_SETUP";

    /// <summary>At least one service can take bookings.</summary>
    public const string Active = "ACTIVE";
}

/// <summary>Per-service facts and token permissions the portal access is derived from.</summary>
/// <param name="AnyServiceApproved">At least one Expert-Service qualification is APPROVED_FOR_SERVICE.</param>
/// <param name="AnyServiceBookable">At least one approved service has an approved price and can take bookings.</param>
/// <param name="CanManageServices">The token carries the ServiceManage permission (EXPERT role).</param>
/// <param name="CanWorkCases">The token carries the CaseWork permission (EXPERT role).</param>
public sealed record PortalFacts(
    bool AnyServiceApproved,
    bool AnyServiceBookable,
    bool CanManageServices,
    bool CanWorkCases
);

/// <summary>Derives the stage and capabilities; permissions keep existing experts working meanwhile.</summary>
public static class PortalAccessRules
{
    public static string StageOf(PortalFacts facts)
    {
        if (facts.AnyServiceBookable || facts.CanWorkCases)
            return PortalStage.Active;
        return facts.AnyServiceApproved || facts.CanManageServices
            ? PortalStage.ServiceSetup
            : PortalStage.Application;
    }

    /// <summary>
    /// Why a service cannot take bookings yet, judged from the Gate 1 application while no Expert-Service
    /// qualification exists: APPLICATION_NOT_SUBMITTED, ELIGIBILITY_PENDING, NOT_ELIGIBLE or COMPETENCY_REVIEW_PENDING.
    /// </summary>
    public static string ReasonBeforeQualification(string? applicationStatus) =>
        applicationStatus switch
        {
            null or ExpertApplicationStatus.Draft => "APPLICATION_NOT_SUBMITTED",
            ExpertApplicationStatus.NotEligible => "NOT_ELIGIBLE",
            ExpertApplicationStatus.Eligible => "COMPETENCY_REVIEW_PENDING",
            _ => "ELIGIBILITY_PENDING",
        };

    /// <summary>
    /// Why a service cannot take bookings yet once an Expert-Service qualification exists:
    /// COMPETENCY_REVIEW_IN_PROGRESS, COMPETENCY_NEED_MORE_INFORMATION, FINAL_APPROVAL_PENDING,
    /// COMPETENCY_FAILED, SERVICE_SUSPENDED or PRICING_PENDING.
    /// </summary>
    public static string ReasonForQualification(string qualificationStatus) =>
        qualificationStatus switch
        {
            QualificationStatus.NeedMoreInformation => "COMPETENCY_NEED_MORE_INFORMATION",
            QualificationStatus.PendingFinalApproval => "FINAL_APPROVAL_PENDING",
            QualificationStatus.Fail => "COMPETENCY_FAILED",
            QualificationStatus.Suspended => "SERVICE_SUSPENDED",
            QualificationStatus.ApprovedForService => "PRICING_PENDING",
            _ => "COMPETENCY_REVIEW_IN_PROGRESS",
        };

    public static string[] CapabilitiesOf(PortalFacts facts)
    {
        var capabilities = new List<string> { PortalCapabilities.Application };
        var stage = StageOf(facts);
        if (stage != PortalStage.Application)
        {
            capabilities.Add(PortalCapabilities.ServicesManage);
            capabilities.Add(PortalCapabilities.PublicProfile);
        }
        if (stage == PortalStage.Active)
        {
            capabilities.Add(PortalCapabilities.CasesWork);
            capabilities.Add(PortalCapabilities.IncomeView);
        }
        return capabilities.ToArray();
    }
}
