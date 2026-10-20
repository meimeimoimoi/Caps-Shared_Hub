using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Portal;

namespace Caps.Expert.UnitTests;

public sealed class PortalAccessTests
{
    private static PortalFacts Facts(
        bool approved = false,
        bool bookable = false,
        bool manage = false,
        bool cases = false
    ) => new(approved, bookable, manage, cases);

    [Fact]
    public void Applicants_only_see_their_application()
    {
        var facts = Facts();

        Assert.Equal(PortalStage.Application, PortalAccessRules.StageOf(facts));
        Assert.Equal([PortalCapabilities.Application], PortalAccessRules.CapabilitiesOf(facts));
    }

    [Fact]
    public void An_approved_service_opens_service_setup_but_not_cases()
    {
        var capabilities = PortalAccessRules.CapabilitiesOf(Facts(approved: true));

        Assert.Contains(PortalCapabilities.ServicesManage, capabilities);
        Assert.Contains(PortalCapabilities.PublicProfile, capabilities);
        Assert.DoesNotContain(PortalCapabilities.CasesWork, capabilities);
        Assert.DoesNotContain(PortalCapabilities.IncomeView, capabilities);
    }

    [Fact]
    public void A_bookable_service_opens_everything()
    {
        var facts = Facts(approved: true, bookable: true);

        Assert.Equal(PortalStage.Active, PortalAccessRules.StageOf(facts));
        Assert.Contains(PortalCapabilities.CasesWork, PortalAccessRules.CapabilitiesOf(facts));
        Assert.Contains(PortalCapabilities.IncomeView, PortalAccessRules.CapabilitiesOf(facts));
    }

    [Fact]
    public void Expert_role_permissions_unlock_the_portal_without_a_qualification()
    {
        Assert.Equal(PortalStage.ServiceSetup, PortalAccessRules.StageOf(Facts(manage: true)));
        Assert.Equal(
            PortalStage.Active,
            PortalAccessRules.StageOf(Facts(manage: true, cases: true))
        );
    }

    [Theory]
    [InlineData(null, "APPLICATION_NOT_SUBMITTED")]
    [InlineData(ExpertApplicationStatus.Draft, "APPLICATION_NOT_SUBMITTED")]
    [InlineData(ExpertApplicationStatus.Submitted, "ELIGIBILITY_PENDING")]
    [InlineData(ExpertApplicationStatus.NeedMoreInformation, "ELIGIBILITY_PENDING")]
    [InlineData(ExpertApplicationStatus.NotEligible, "NOT_ELIGIBLE")]
    [InlineData(ExpertApplicationStatus.Eligible, "COMPETENCY_REVIEW_PENDING")]
    public void Service_readiness_explains_the_gate_1_step(string? status, string reason)
    {
        Assert.Equal(reason, PortalAccessRules.ReasonBeforeQualification(status));
    }
}
