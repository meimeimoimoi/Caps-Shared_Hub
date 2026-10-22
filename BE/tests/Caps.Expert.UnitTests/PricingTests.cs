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

    private static PlatformFee Rate(int percent = 20) =>
        PlatformFee.Set(Service, percent, Admin, Now);

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
    [InlineData(99, 10_000, 100)]
    public void Net_amount_removes_the_platform_fee(int percent, long fee, long net) =>
        Assert.Equal(net, Rate(percent).NetOf(fee));

    [Theory]
    [InlineData(-1)]
    [InlineData(100)]
    public void Platform_fee_must_be_0_to_99(int percent) =>
        Assert.Equal("PLATFORM_FEE_INVALID", Errors.CodeOf(() => Rate(percent)));

    [Fact]
    public void Platform_fee_belongs_to_the_catalog_service()
    {
        var rate = PlatformFee.Set(Service, 20, Admin, Now);

        Assert.Equal("HUMAN_VERIFICATION", rate.ServiceCode);
        Assert.Equal((Admin, Now), (rate.SetBy, rate.EffectiveFrom));
    }

    [Fact]
    public void Approved_expert_prices_the_service()
    {
        var q = Approved();

        var offering = ServiceOffering.Create(q, Rate(), 1_500_000, 48, Now);

        Assert.Equal(q.ExpertProfileId, offering.ExpertProfileId);
        Assert.Equal("HUMAN_VERIFICATION", offering.ServiceCode);
        Assert.Equal((1_500_000L, 48), (offering.Fee, offering.TurnaroundHours));
    }

    [Fact]
    public void Expert_not_approved_for_the_service_cannot_price_it() =>
        Assert.Equal(
            "PRICING_NOT_ALLOWED",
            Errors.CodeOf(() => ServiceOffering.Create(Registered(), Rate(), 1_000_000, 48, Now))
        );

    [Fact]
    public void Expert_never_registered_for_the_service_cannot_price_it() =>
        Assert.Equal(
            "PRICING_NOT_ALLOWED",
            Errors.CodeOf(() => ServiceOffering.Create(null, Rate(), 1_000_000, 48, Now))
        );

    [Theory]
    [InlineData(9_000)]
    [InlineData(10_500)]
    [InlineData(1_000_001_000)]
    [InlineData(0)]
    public void Fee_outside_the_range_or_step_is_rejected(long fee) =>
        Assert.Equal(
            "FEE_INVALID",
            Errors.CodeOf(() => ServiceOffering.Create(Approved(), Rate(), fee, 48, Now))
        );

    [Theory]
    [InlineData(10_000)]
    [InlineData(1_000_000_000)]
    public void Fee_limits_are_allowed(long fee) =>
        Assert.Equal(fee, ServiceOffering.Create(Approved(), Rate(), fee, 48, Now).Fee);

    [Theory]
    [InlineData(0)]
    [InlineData(721)]
    public void Turnaround_outside_1_to_720_hours_is_rejected(int hours) =>
        Assert.Equal(
            "TURNAROUND_INVALID",
            Errors.CodeOf(() => ServiceOffering.Create(Approved(), Rate(), 1_000_000, hours, Now))
        );

    [Fact]
    public void Repricing_changes_price_and_time()
    {
        var q = Approved();
        var offering = ServiceOffering.Create(q, Rate(), 1_000_000, 48, Now);

        offering.Reprice(q, 2_000_000, 24, Now.AddDays(1));

        Assert.Equal((2_000_000L, 24), (offering.Fee, offering.TurnaroundHours));
        Assert.Equal(Now.AddDays(1), offering.UpdatedAt);
    }

    [Fact]
    public void Suspended_service_cannot_be_repriced()
    {
        var q = Approved();
        var offering = ServiceOffering.Create(q, Rate(), 1_000_000, 48, Now);
        q.ChangeServiceAccess(Admin, ServiceAccessAction.Suspend, "Complaints under review", Now);

        Assert.Equal(
            "PRICING_NOT_ALLOWED",
            Errors.CodeOf(() => offering.Reprice(q, 2_000_000, 24, Now))
        );
    }
}
