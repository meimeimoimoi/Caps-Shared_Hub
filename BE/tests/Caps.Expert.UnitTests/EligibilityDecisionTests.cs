using Caps.Expert.Domain.Applications;

namespace Caps.Expert.UnitTests;

public sealed class EligibilityDecisionTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 17, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Applicant = Guid.NewGuid();
    private static readonly Guid Reviewer = Guid.NewGuid();
    private static readonly EligibilityPolicy Policy = new(5, TimeSpan.FromDays(30));

    private static ExpertApplication Submitted()
    {
        var application = ExpertApplication.Open(Guid.NewGuid(), null, Applicant, Now).Application;
        application.Submit(Applicant, Now);
        return application;
    }

    /// <summary>All six requirements PASS, with the given overrides.</summary>
    private static CriterionResult[] Results(params CriterionResult[] overrides) =>
        EligibilityCriteria
            .Codes.Select(code =>
                overrides.FirstOrDefault(x => x.Code == code)
                ?? new CriterionResult(code, EligibilityCriteria.Pass, null)
            )
            .ToArray();

    private static EligibilityDecision Decide(
        ExpertApplication application,
        CriterionResult[] results,
        int? years = 6,
        Guid? reviewer = null
    ) =>
        application.DecideEligibility(
            reviewer ?? Reviewer,
            Applicant,
            years,
            results,
            "note",
            Policy,
            Now
        );

    [Fact]
    public void All_requirements_passing_makes_the_expert_eligible()
    {
        var application = Submitted();

        var decision = Decide(application, Results());

        Assert.Equal(ExpertApplicationStatus.Eligible, application.Status);
        Assert.Equal(Now, application.DecidedAt);
        Assert.Null(application.EarliestReapplyAt);
        Assert.Equal(ExpertApplicationStatus.Submitted, decision.Event.FromStatus);
        Assert.Equal(Reviewer, decision.Event.ActorUserId);
        Assert.Equal(6, decision.Checks.Count);
        Assert.All(decision.Checks, x => Assert.Equal(decision.Event.Id, x.EventId));
    }

    [Fact]
    public void Any_failed_requirement_closes_the_application_with_a_reapply_date()
    {
        var application = Submitted();
        var results = Results(
            new CriterionResult("EV-02", EligibilityCriteria.Fail, "No tax certificate"),
            new CriterionResult(
                "EV-03",
                EligibilityCriteria.NeedMoreInformation,
                "Send training records"
            )
        );

        Decide(application, results);

        Assert.Equal(ExpertApplicationStatus.NotEligible, application.Status);
        Assert.Equal(Now.AddDays(30), application.EarliestReapplyAt);
        Assert.True(ExpertApplicationStatus.IsClosed(application.Status));
    }

    [Fact]
    public void Missing_information_returns_the_application_to_the_applicant()
    {
        var application = Submitted();

        Decide(
            application,
            Results(
                new CriterionResult(
                    "EV-04",
                    EligibilityCriteria.NeedMoreInformation,
                    "Upload the signed pledge"
                )
            )
        );

        Assert.Equal(ExpertApplicationStatus.NeedMoreInformation, application.Status);
        Assert.Null(application.DecidedAt);
        Assert.True(application.NeedsInformation);
        application.Resubmit(Applicant, null, Now.AddDays(1));
        Assert.Equal(ExpertApplicationStatus.Submitted, application.Status);
    }

    [Fact]
    public void Results_other_than_pass_need_a_note()
    {
        var error = Errors.CodeOf(() =>
            Decide(
                Submitted(),
                Results(new CriterionResult("EV-01", EligibilityCriteria.Fail, " "))
            )
        );

        Assert.Equal("ELIGIBILITY_NOTE_REQUIRED", error);
    }

    [Fact]
    public void Every_requirement_needs_exactly_one_known_result()
    {
        var missing = Results().Take(5).ToArray();
        var duplicated = Results()
            .Append(new CriterionResult("EV-01", EligibilityCriteria.Pass, null))
            .ToArray();
        var unknownResult = Results(new CriterionResult("EV-05", "MAYBE", "?"));

        Assert.Equal(
            "INVALID_ELIGIBILITY_CRITERIA",
            Errors.CodeOf(() => Decide(Submitted(), missing))
        );
        Assert.Equal(
            "INVALID_ELIGIBILITY_CRITERIA",
            Errors.CodeOf(() => Decide(Submitted(), duplicated))
        );
        Assert.Equal(
            "INVALID_ELIGIBILITY_RESULT",
            Errors.CodeOf(() => Decide(Submitted(), unknownResult))
        );
    }

    [Fact]
    public void Experience_cannot_pass_below_the_policy_minimum()
    {
        var error = Errors.CodeOf(() => Decide(Submitted(), Results(), years: 4));

        Assert.Equal("EXPERIENCE_BELOW_MINIMUM", error);
        Assert.Equal(EligibilityCriteria.Fail, EligibilityRules.SuggestExperience(4, Policy));
        Assert.Equal(EligibilityCriteria.Pass, EligibilityRules.SuggestExperience(5, Policy));
    }

    [Fact]
    public void Only_submitted_applications_can_be_decided()
    {
        var draft = ExpertApplication.Open(Guid.NewGuid(), null, Applicant, Now).Application;
        var decided = Submitted();
        Decide(decided, Results());

        Assert.Equal("APPLICATION_NOT_IN_REVIEW", Errors.CodeOf(() => Decide(draft, Results())));
        Assert.Equal("APPLICATION_NOT_IN_REVIEW", Errors.CodeOf(() => Decide(decided, Results())));
    }

    [Fact]
    public void Reviewers_cannot_decide_their_own_application()
    {
        var error = Errors.CodeOf(() => Decide(Submitted(), Results(), reviewer: Applicant));

        Assert.Equal("SELF_REVIEW_NOT_ALLOWED", error);
    }

    [Fact]
    public void An_eligible_expert_cannot_open_another_application()
    {
        var eligible = Submitted();
        Decide(eligible, Results());

        var error = Errors.CodeOf(() =>
            ExpertApplication.Open(Guid.NewGuid(), eligible, Applicant, Now.AddDays(60))
        );

        Assert.Equal("ALREADY_ELIGIBLE", error);
    }

    [Fact]
    public void Reapplying_after_not_eligible_waits_for_the_policy_interval()
    {
        var closed = Submitted();
        Decide(
            closed,
            Results(new CriterionResult("EV-06", EligibilityCriteria.Fail, "3 years only")),
            years: 3
        );

        Assert.Equal(
            "REAPPLY_TOO_EARLY",
            Errors.CodeOf(() =>
                ExpertApplication.Open(Guid.NewGuid(), closed, Applicant, Now.AddDays(29))
            )
        );
        var (reopened, _) = ExpertApplication.Open(
            Guid.NewGuid(),
            closed,
            Applicant,
            Now.AddDays(30)
        );
        Assert.Equal(closed.Id, reopened.PreviousApplicationId);
    }
}
