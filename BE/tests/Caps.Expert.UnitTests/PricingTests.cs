using Caps.Common.Domain;
using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Features.PlatformFees;
using Caps.Expert.Application.Features.Policies;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Policies;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Profiles;
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

    // BR-E18: a price outside the current range is hidden from the marketplace until the expert fixes it
    [Fact]
    public void A_price_outside_the_range_or_off_step_is_not_allowed()
    {
        Assert.True(Policy.Allows(1_000_000));
        Assert.False(Policy.Allows(490_000));
        Assert.False(Policy.Allows(30_010_000));
        Assert.False(Policy.Allows(1_005_000));
    }

    // First rate of the service: takes effect at once
    private static PlatformFee Rate(
        int percent = 20,
        string? reason = "Agreed with the advisor",
        int noDelivery = 50
    ) =>
        PlatformFee.Set(
            Service,
            percent,
            24,
            30,
            72,
            3,
            50,
            30,
            noDelivery,
            null,
            false,
            Policy.FeeNoticeDays,
            reason,
            Admin,
            Now
        );

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
    [InlineData(null)]
    [InlineData("   ")]
    public void A_rate_needs_a_reason(string? reason) =>
        Assert.Equal("POLICY_REASON_REQUIRED", Errors.CodeOf(() => Rate(reason: reason)));

    [Fact]
    public void A_later_rate_starts_at_local_midnight_stored_in_utc()
    {
        // PostgreSQL timestamptz only takes UTC offsets; the day still starts at 00:00 Vietnam time
        var later = PlatformFee.Set(
            Service,
            40,
            24,
            50,
            24,
            3,
            0,
            60,
            50,
            new DateOnly(2026, 11, 1),
            true,
            Policy.FeeNoticeDays,
            "Agreed with the advisor",
            Admin,
            Now
        );

        Assert.Equal(TimeSpan.Zero, later.EffectiveFrom.Offset);
        Assert.Equal(
            new DateTimeOffset(2026, 10, 31, 17, 0, 0, TimeSpan.Zero),
            later.EffectiveFrom
        );
    }

    [Fact]
    public void A_reason_is_bounded() =>
        Assert.Equal(
            "POLICY_REASON_TOO_LONG",
            Errors.CodeOf(() => Rate(reason: new string('x', PlatformFee.MaxReasonLength + 1)))
        );

    [Fact]
    public void The_reason_is_kept_with_the_rate() =>
        Assert.Equal("Agreed with the advisor", Rate(reason: "  Agreed with the advisor ").Reason);

    [Theory]
    [InlineData(20, -1, 30, 72)] // negative hours
    [InlineData(20, 24, 101, 72)] // penalty over 100%
    [InlineData(20, 24, 30, 23)] // cancel before the penalty band ends
    [InlineData(20, 24, 30, 721)] // past the cap
    public void A_late_rule_out_of_range_is_rejected(
        int percent,
        int hours,
        int penalty,
        int cancel
    )
    {
        var e = Assert.Throws<AppException>(() =>
            PlatformFee.Set(
                Service,
                percent,
                hours,
                penalty,
                cancel,
                3,
                50,
                30,
                50,
                null,
                false,
                Policy.FeeNoticeDays,
                "Agreed with the advisor",
                Admin,
                Now
            )
        );
        Assert.Equal("LATE_RULE_INVALID", e.Code);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void A_no_delivery_refund_out_of_range_is_rejected(int refund) =>
        Assert.Equal("NO_DELIVERY_RULE_INVALID", Errors.CodeOf(() => Rate(noDelivery: refund)));

    [Fact]
    public void The_no_delivery_refund_is_kept_with_the_rate() =>
        Assert.Equal(50, Rate(noDelivery: 50).NoDeliveryRefundPercent);

    [Theory]
    [InlineData(0, 50, 30)] // no days
    [InlineData(4, 50, 30)] // past 3 working days: two questions would pause the case over 6 working days
    [InlineData(3, -1, 30)] // negative share
    [InlineData(3, 80, 30)] // client + expert over 100%
    public void A_no_response_rule_out_of_range_is_rejected(int days, int refund, int expert)
    {
        var e = Assert.Throws<AppException>(() =>
            PlatformFee.Set(
                Service,
                20,
                24,
                30,
                72,
                days,
                refund,
                expert,
                50,
                null,
                false,
                Policy.FeeNoticeDays,
                "Agreed with the advisor",
                Admin,
                Now
            )
        );
        Assert.Equal("NO_RESPONSE_RULE_INVALID", e.Code);
    }

    [Fact]
    public void The_no_response_rule_is_kept_with_the_rate()
    {
        var rate = Rate();

        Assert.Equal(3, rate.NoResponseDays);
        Assert.Equal(50, rate.NoResponseRefundPercent);
        Assert.Equal(30, rate.NoResponseExpertPercent);
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

    // Experts who priced the service hear of an announced fee change in their own numbers
    [Fact]
    public async Task A_fee_change_tells_each_pricing_expert_what_they_keep_now_and_after()
    {
        var offering = Offer(Approved(), 1_000_000, 48);
        var expert = ExpertProfile.Create(Guid.NewGuid(), "Mai", Now);
        expert.RecordContactEmail("mai@example.test");
        var current = Rate(20);
        var change = PlatformFee.Set(
            Service,
            25,
            24,
            30,
            72,
            3,
            50,
            30,
            100,
            new DateOnly(2026, 11, 1),
            true,
            Policy.FeeNoticeDays,
            "Higher card fees",
            Admin,
            Now
        );
        var outbox = new FakeOutbox();

        await PlatformFeeNotices.EnqueueAsync(
            new FakeOfferings([(offering, expert)]),
            outbox,
            Service,
            current,
            change,
            false,
            Now,
            default
        );

        var sent = Assert.Single(outbox.Fees);
        Assert.Equal((expert.UserId, "mai@example.test"), (sent.UserId, sent.Email));
        Assert.Equal((1_000_000L, 20, 800_000L), (sent.Fee, sent.CurrentPercent, sent.NetNow));
        Assert.Equal((25, 750_000L), (sent.NewPercent, sent.NetNew));
        Assert.Equal((change.EffectiveFrom, "Higher card fees"), (sent.EffectiveFrom, sent.Reason));
        Assert.False(sent.Cancelled);
    }

    // Only experts the narrower range has just pushed out hear of it; a wider range tells nobody
    [Fact]
    public async Task A_narrower_price_range_tells_only_the_experts_it_pushes_out()
    {
        var expert = ExpertProfile.Create(Guid.NewGuid(), "Mai", Now);
        expert.RecordContactEmail("mai@example.test");
        var pushedOut = Offer(Approved(), 800_000, 48);
        var alreadyOut = Offer(Approved(), 600_000, 48);
        var inside = Offer(Approved(), 2_000_000, 48);
        var repo = new FakeOfferings([(pushedOut, expert), (alreadyOut, expert), (inside, expert)]);
        var before = Range(700_000, 30_000_000);
        var outbox = new FakeOutbox();

        await PriceRangeNotices.EnqueueAsync(
            repo,
            outbox,
            before,
            Range(1_000_000, 30_000_000),
            "Raise the floor",
            Now,
            default
        );
        await PriceRangeNotices.EnqueueAsync(
            repo,
            outbox,
            before,
            Range(500_000, 30_000_000),
            "Lower the floor",
            Now,
            default
        );

        var sent = Assert.Single(outbox.OutOfRange);
        Assert.Equal((800_000L, 1_000_000L, 30_000_000L), (sent.Fee, sent.MinFee, sent.MaxFee));
        Assert.Equal(
            ("mai@example.test", "Human verification", "Raise the floor"),
            (sent.Email, sent.ServiceName, sent.Reason)
        );
    }

    private static Dictionary<string, int> Range(int min, int max) =>
        new() { [PolicySettingKeys.PricingMinFee] = min, [PolicySettingKeys.PricingMaxFee] = max };

    private sealed class FakeOfferings(
        IReadOnlyList<(ServiceOffering Offering, ExpertProfile Expert)> rows
    ) : IServiceOfferingRepository
    {
        public Task<
            IReadOnlyList<(ServiceOffering Offering, ExpertProfile Expert)>
        > ListByServiceAsync(string serviceCode, CancellationToken ct) => Task.FromResult(rows);

        public Task<
            IReadOnlyList<(ServiceOffering Offering, ExpertProfile Expert, string ServiceName)>
        > ListPricedOutsideAsync(long minFee, long maxFee, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<(ServiceOffering, ExpertProfile, string)>>([
                .. rows.Where(x => x.Offering.Fee < minFee || x.Offering.Fee > maxFee)
                    .Select(x => (x.Offering, x.Expert, Service.Name)),
            ]);

        public Task<ServiceOffering?> FindAsync(
            Guid profileId,
            string serviceCode,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<ServiceOffering>> ListAsync(
            IReadOnlyCollection<Guid> profileIds,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<ServiceOfferingChange>> ListChangesAsync(
            Guid profileId,
            string serviceCode,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public void Add(ServiceOffering offering) => throw new NotSupportedException();

        public void AddChange(ServiceOfferingChange change) => throw new NotSupportedException();
    }

    private sealed class FakeOutbox : IExpertNotificationOutbox
    {
        public List<PlatformFeeChangeAnnouncedEvent> Fees { get; } = [];

        public List<ExpertPriceOutOfRangeEvent> OutOfRange { get; } = [];

        public void Enqueue(ExpertPriceOutOfRangeEvent message, DateTimeOffset now) =>
            OutOfRange.Add(message);

        public void Enqueue(PlatformFeeChangeAnnouncedEvent message, DateTimeOffset now) =>
            Fees.Add(message);

        public void Enqueue(ExpertEligibilityDecidedEvent message, DateTimeOffset now) { }

        public void Enqueue(ExpertCompetencyDecidedEvent message, DateTimeOffset now) { }

        public void Enqueue(ExpertServiceAccessChangedEvent message, DateTimeOffset now) { }

        public void Enqueue(ExpertExcuseRequestedEvent message, DateTimeOffset now) { }
    }
}
