using Caps.Common.Domain;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.UnitTests;

public sealed class PricingTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 22, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Reviewer = Guid.NewGuid();
    private static readonly Guid Admin = Guid.NewGuid();
    private static readonly Guid Cv = Guid.NewGuid();

    private static readonly ServiceCatalogItem Service = ServiceCatalogItem.Create(
        "HUMAN_VERIFICATION",
        "Human verification",
        72,
        1,
        Now
    );

    // Default admin policy: 500,000 to 30,000,000 VND, 1 to 7 days, 7 days notice, warning above 50%
    private static readonly PricingPolicy Policy = new(500_000, 30_000_000, 1, 7, 7, 50);

    // First rate of the service: takes effect at once
    private static PlatformFee Rate(int percent = 20) =>
                PlatformFee.Set(Service, percent, 24, 30, 72, null, false, Policy.FeeNoticeDays, Admin, Now);

    private static ServiceOffering Offer(ExpertServiceQualification? q, long fee, int hours) =>
        ServiceOffering.Create(q, Rate(), fee, hours, Policy, Expert, Now).Offering;

    // Gate 1 passed and Gate 2 registered for the service, competency not decided yet
    private static ExpertServiceQualification Registered()
    {
        var application = ExpertApplication.Open(Guid.NewGuid(), null, Expert, Now).Application;
        application.Submit(Expert, Now);
        application.DecideEligibility(
            Reviewer,
            Expert,
            6,
            EligibilityCriteria
                .Codes.Select(code => new CriterionResult(code, EligibilityCriteria.Pass, null))
                .ToArray(),
            null,
            new(5, TimeSpan.FromDays(30)),
            Now
        );
        return ExpertServiceQualification
            .Register(application, Service.Code, null, Expert, Now)
            .Qualification;
    }

    // Gate 2 passed and finally approved: the expert may sell the service
    private static ExpertServiceQualification Approved()
    {
        var q = Registered();
        q.Submit(Expert, 1, Now);
        q.DecideCompetency(
            Reviewer,
            Expert,
            CompetencyCriteria
                .Codes.Select(code => new CompetencyResult(
                    code,
                    CompetencyCriteria.Pass,
                    "note",
                    [Cv]
                ))
                .ToArray(),
            new HashSet<Guid> { Cv },
            null,
            new(TimeSpan.FromDays(90)),
            Now
        );
        q.DecideFinalApproval(Admin, Expert, FinalApprovalDecision.Approve, null, Now);
        return q;
    }

    [Theory]
    [InlineData(25, 1_000_000, 750_000)]
    [InlineData(33, 1_000_000, 670_000)]
    [InlineData(0, 1_234_000, 1_234_000)]
    [InlineData(50, 500_000, 250_000)]
    public void Net_amount_removes_the_platform_fee(int percent, long fee, long net) =>
        Assert.Equal(net, Rate(percent).NetOf(fee));

    [Theory]
    [InlineData(-1)]
    [InlineData(51)]
    public void Platform_fee_must_be_0_to_50(int percent) =>
        Assert.Equal("PLATFORM_FEE_INVALID", Errors.CodeOf(() => Rate(percent)));

    [Theory]
    [InlineData(20, -1, 30, 72)] // negative hours
    [InlineData(20, 24, 81, 72)] // penalty + platform fee over 100%
    [InlineData(20, 24, 30, 23)] // cancel before the penalty band ends
    [InlineData(20, 24, 30, 721)] // past the cap
    public void A_late_rule_out_of_range_is_rejected(int percent, int hours, int penalty, int cancel)
    {
        var e = Assert.Throws<AppException>(() =>
            PlatformFee.Set(Service, percent, hours, penalty, cancel, null, false, Policy.FeeNoticeDays, Admin, Now)
        );
        Assert.Equal("LATE_RULE_INVALID", e.Code);
    }


    [Fact]
    public void Platform_fee_belongs_to_the_catalog_service()
    {
        var rate = Rate();

        Assert.Equal("HUMAN_VERIFICATION", rate.ServiceCode);
        Assert.Equal((Admin, Now), (rate.SetBy, rate.EffectiveFrom));
    }

    [Fact]
    public void Approved_expert_prices_the_service()
    {
        var q = Approved();

        var offering = Offer(q, 1_500_000, 48);

        Assert.Equal(q.ExpertProfileId, offering.ExpertProfileId);
        Assert.Equal("HUMAN_VERIFICATION", offering.ServiceCode);
        Assert.Equal((1_500_000L, 48), (offering.Fee, offering.TurnaroundHours));
    }

    [Fact]
    public void Expert_not_approved_for_the_service_cannot_price_it() =>
        Assert.Equal(
            "PRICING_NOT_ALLOWED",
            Errors.CodeOf(() => Offer(Registered(), 1_000_000, 48))
        );

    [Fact]
    public void Expert_never_registered_for_the_service_cannot_price_it() =>
        Assert.Equal("PRICING_NOT_ALLOWED", Errors.CodeOf(() => Offer(null, 1_000_000, 48)));

    [Theory]
    [InlineData(490_000)]
    [InlineData(505_000)]
    [InlineData(30_010_000)]
    [InlineData(0)]
    public void Fee_outside_the_range_or_step_is_rejected(long fee) =>
        Assert.Equal("FEE_INVALID", Errors.CodeOf(() => Offer(Approved(), fee, 48)));

    [Theory]
    [InlineData(500_000)]
    [InlineData(30_000_000)]
    public void Fee_limits_are_allowed(long fee) =>
        Assert.Equal(fee, Offer(Approved(), fee, 48).Fee);

    [Theory]
    [InlineData(0)]
    [InlineData(12)]
    [InlineData(192)]
    public void Turnaround_outside_whole_days_1_to_7_is_rejected(int hours) =>
        Assert.Equal(
            "TURNAROUND_INVALID",
            Errors.CodeOf(() => Offer(Approved(), 1_000_000, hours))
        );

    [Fact]
    public void Repricing_changes_price_and_time()
    {
        var q = Approved();
        var offering = Offer(q, 1_000_000, 48);

        offering.Reprice(q, 2_000_000, 24, Policy, Expert, Now.AddDays(1));

        Assert.Equal((2_000_000L, 24), (offering.Fee, offering.TurnaroundHours));
        Assert.Equal(Now.AddDays(1), offering.UpdatedAt);
    }

    [Fact]
    public void Suspended_service_cannot_be_repriced()
    {
        var q = Approved();
        var offering = Offer(q, 1_000_000, 48);
        q.ChangeServiceAccess(Admin, ServiceAccessAction.Suspend, "Complaints under review", Now);

        Assert.Equal(
            "PRICING_NOT_ALLOWED",
            Errors.CodeOf(() => offering.Reprice(q, 2_000_000, 24, Policy, Expert, Now))
        );
    }
}
