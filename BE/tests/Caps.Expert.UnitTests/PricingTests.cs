using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.UnitTests;

public sealed class PricingTests
{
    // 01:00 UTC = 08:00 in Vietnam, so the business date is 2026-10-18
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 1, 0, 0, TimeSpan.Zero);
    private static readonly DateOnly Today = new(2026, 10, 18);
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Reviewer = Guid.NewGuid();
    private static readonly Guid Admin = Guid.NewGuid();
    private static readonly PricingPolicy Policy = new(1_000_000, 10_000_000, 50);

    private static ExpertServiceQualification Approved()
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
        var q = ExpertServiceQualification
            .Register(application, "HUMAN_VERIFICATION", null, Expert, Now)
            .Qualification;
        var cv = Guid.NewGuid();
        q.DecideCompetency(
            Reviewer,
            Expert,
            CompetencyCriteria
                .Codes.Select(code => new CompetencyResult(
                    code,
                    CompetencyCriteria.Pass,
                    "ok",
                    [cv]
                ))
                .ToArray(),
            new HashSet<Guid> { cv },
            null,
            new(TimeSpan.FromDays(90)),
            Now
        );
        q.DecideFinalApproval(Admin, Expert, FinalApprovalDecision.Approve, null, Now);
        return q;
    }

    private static ServicePricingVersion Submitted(
        ExpertServiceQualification q,
        long amount,
        ServicePricingVersion? current,
        int sequence = 1,
        DateOnly? from = null
    )
    {
        var v = ServicePricingVersion.CreateDraft(q, sequence, Now);
        v.Save(Expert, amount, from ?? Today, "Market rate", Policy, Now);
        v.Submit(Expert, current, Policy, Now);
        return v;
    }

    [Fact]
    public void The_first_price_in_range_is_approved_by_the_system()
    {
        var v = Submitted(Approved(), 2_000_000, null);

        Assert.Equal(PricingStatus.Approved, v.Status);
        Assert.True(v.AutoApproved);
        Assert.Null(v.DecidedByUserId);
        Assert.Null(v.ChangePercent);
    }

    [Fact]
    public void A_change_within_the_threshold_is_approved_and_supersedes_the_old_price()
    {
        var q = Approved();
        var first = Submitted(q, 2_000_000, null);

        var second = Submitted(q, 2_800_000, first, 2, Today.AddDays(7));

        Assert.Equal(PricingStatus.Approved, second.Status);
        Assert.Equal(40, second.ChangePercent);
        Assert.Equal(PricingStatus.Superseded, first.Status);
        Assert.Equal(Today.AddDays(6), first.EffectiveTo);
        Assert.True(first.IsInEffect(Today));
        Assert.False(first.IsInEffect(Today.AddDays(7)));
        Assert.True(second.IsInEffect(Today.AddDays(7)));
    }

    [Fact]
    public void A_change_above_the_threshold_waits_for_a_system_admin()
    {
        var q = Approved();
        var first = Submitted(q, 2_000_000, null);

        var second = Submitted(q, 4_000_000, first, 2);

        Assert.Equal(PricingStatus.PendingApproval, second.Status);
        Assert.Equal(100, second.ChangePercent);
        Assert.False(second.AutoApproved);
        Assert.Equal(PricingStatus.Approved, first.Status);
    }

    [Fact]
    public void An_admin_decides_pending_changes_and_must_explain_a_return_or_rejection()
    {
        var q = Approved();
        var first = Submitted(q, 2_000_000, null);
        var pending = Submitted(q, 4_000_000, first, 2);
        Assert.Equal(
            "PRICING_NOTE_REQUIRED",
            Errors.CodeOf(() =>
                pending.Decide(Admin, PricingDecision.ReturnForRevision, null, first, Now)
            )
        );

        pending.Decide(Admin, PricingDecision.Approve, null, first, Now);

        Assert.Equal(PricingStatus.Approved, pending.Status);
        Assert.Equal(Admin, pending.DecidedByUserId);
        Assert.Equal(PricingStatus.Superseded, first.Status);
    }

    [Fact]
    public void A_returned_price_can_be_edited_and_submitted_again()
    {
        var q = Approved();
        var first = Submitted(q, 2_000_000, null);
        var pending = Submitted(q, 4_000_000, first, 2);
        pending.Decide(Admin, PricingDecision.ReturnForRevision, "Too steep", first, Now);

        pending.Save(Expert, 2_500_000, Today, "Smaller step", Policy, Now);
        pending.Submit(Expert, first, Policy, Now);

        Assert.Equal(PricingStatus.Approved, pending.Status);
        Assert.True(pending.AutoApproved);
    }

    [Fact]
    public void Out_of_range_amounts_past_dates_and_missing_reasons_are_refused()
    {
        var v = ServicePricingVersion.CreateDraft(Approved(), 1, Now);

        Assert.Equal(
            "PRICE_OUT_OF_RANGE",
            Errors.CodeOf(() => v.Save(Expert, 500_000, Today, "x", Policy, Now))
        );
        Assert.Equal(
            "EFFECTIVE_DATE_IN_PAST",
            Errors.CodeOf(() => v.Save(Expert, 2_000_000, Today.AddDays(-1), "x", Policy, Now))
        );
        v.Save(Expert, 2_000_000, Today, null, Policy, Now);
        Assert.Equal(
            "PRICING_REASON_REQUIRED",
            Errors.CodeOf(() => v.Submit(Expert, null, Policy, Now))
        );
    }

    [Fact]
    public void Approved_prices_are_never_edited()
    {
        var v = Submitted(Approved(), 2_000_000, null);

        Assert.Equal(
            "PRICING_VERSION_LOCKED",
            Errors.CodeOf(() => v.Save(Expert, 3_000_000, Today, "x", Policy, Now))
        );
    }

    [Fact]
    public void Drafts_need_an_approved_service()
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
        var inReview = ExpertServiceQualification
            .Register(application, "HUMAN_VERIFICATION", null, Expert, Now)
            .Qualification;

        Assert.Equal(
            "PRICING_NOT_ALLOWED",
            Errors.CodeOf(() => ServicePricingVersion.CreateDraft(inReview, 1, Now))
        );
    }
}
