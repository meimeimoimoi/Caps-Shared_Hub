using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.UnitTests;

public sealed class CompetencyDecisionTests
{
    private const string Service = "HUMAN_VERIFICATION";
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Applicant = Guid.NewGuid();
    private static readonly Guid Reviewer = Guid.NewGuid();
    private static readonly CompetencyPolicy Policy = new(TimeSpan.FromDays(90));
    private static readonly Guid Cv = Guid.NewGuid();
    private static readonly HashSet<Guid> Files = [Cv];

    private static ExpertApplication Eligible()
    {
        var application = ExpertApplication.Open(Guid.NewGuid(), null, Applicant, Now).Application;
        application.Submit(Applicant, Now);
        var passed = EligibilityCriteria
            .Codes.Select(code => new CriterionResult(code, EligibilityCriteria.Pass, null))
            .ToArray();
        application.DecideEligibility(
            Reviewer,
            Applicant,
            6,
            passed,
            null,
            new(5, TimeSpan.FromDays(30)),
            Now
        );
        return application;
    }

    private static ExpertServiceQualification Registered(
        ExpertServiceQualification? previous = null,
        DateTimeOffset? at = null
    ) =>
        ExpertServiceQualification
            .Register(Eligible(), Service, previous, Applicant, at ?? Now)
            .Qualification;

    /// <summary>All five competencies PASS citing the CV, with the given overrides.</summary>
    private static CompetencyResult[] Results(params CompetencyResult[] overrides) =>
        CompetencyCriteria
            .Codes.Select(code =>
                overrides.FirstOrDefault(x => x.Code == code)
                ?? new CompetencyResult(code, CompetencyCriteria.Pass, "Matches the CV", [Cv])
            )
            .ToArray();

    private static CompetencyDecision Decide(
        ExpertServiceQualification qualification,
        CompetencyResult[] results,
        Guid? reviewer = null
    ) =>
        qualification.DecideCompetency(
            reviewer ?? Reviewer,
            Applicant,
            results,
            Files,
            "note",
            Policy,
            Now
        );

    [Fact]
    public void Registering_requires_gate_1_eligibility()
    {
        var submitted = ExpertApplication.Open(Guid.NewGuid(), null, Applicant, Now).Application;
        submitted.Submit(Applicant, Now);

        var error = Errors.CodeOf(() =>
            ExpertServiceQualification.Register(submitted, Service, null, Applicant, Now)
        );

        Assert.Equal("ELIGIBILITY_REQUIRED", error);
    }

    [Fact]
    public void Registering_starts_competency_review_on_the_eligible_application()
    {
        var application = Eligible();

        var (qualification, opened) = ExpertServiceQualification.Register(
            application,
            Service,
            null,
            Applicant,
            Now
        );

        Assert.Equal(QualificationStatus.CompetencyReview, qualification.Status);
        Assert.Equal(application.Id, qualification.ApplicationId);
        Assert.Equal(Now, qualification.SubmittedAt);
        Assert.Null(opened.FromStatus);
        Assert.Equal(QualificationStatus.CompetencyReview, opened.ToStatus);
    }

    [Fact]
    public void A_service_cannot_be_registered_twice_while_its_qualification_is_open()
    {
        var open = Registered();

        Assert.Equal("QUALIFICATION_EXISTS", Errors.CodeOf(() => Registered(open)));
    }

    [Fact]
    public void All_competencies_passing_waits_for_final_approval()
    {
        var qualification = Registered();

        var decision = Decide(qualification, Results());

        Assert.Equal(QualificationStatus.PendingFinalApproval, qualification.Status);
        Assert.Equal(Reviewer, qualification.CompetencyReviewerUserId);
        Assert.Equal(Now, qualification.DecidedAt);
        Assert.Null(qualification.EarliestReapplyAt);
        Assert.Equal(5, decision.Assessments.Count);
        Assert.All(decision.Assessments, x => Assert.Equal(decision.Event.Id, x.EventId));
    }

    [Fact]
    public void One_file_can_support_several_competencies()
    {
        var decision = Decide(Registered(), Results());

        Assert.All(
            decision.Assessments,
            x => Assert.Equal(Cv, Assert.Single(x.Evidence).EvidenceId)
        );
    }

    [Fact]
    public void Any_failed_competency_closes_the_qualification_with_a_reapply_date()
    {
        var qualification = Registered();
        var results = Results(
            new CompetencyResult("C4", CompetencyCriteria.Fail, "Misapplies CIT rules", [Cv]),
            new CompetencyResult(
                "C2",
                CompetencyCriteria.NeedMoreInformation,
                "Send a reviewed AI draft",
                []
            )
        );

        Decide(qualification, results);

        Assert.Equal(QualificationStatus.Fail, qualification.Status);
        Assert.Equal(Now.AddDays(90), qualification.EarliestReapplyAt);
        Assert.Null(qualification.CompetencyReviewerUserId);
        Assert.True(QualificationStatus.IsClosed(qualification.Status));
    }

    [Fact]
    public void A_failed_service_can_be_registered_again_only_after_the_policy_wait()
    {
        var failed = Registered();
        Decide(failed, Results(new CompetencyResult("C1", CompetencyCriteria.Fail, "No", [Cv])));

        Assert.Equal("REAPPLY_TOO_EARLY", Errors.CodeOf(() => Registered(failed, Now.AddDays(89))));
        var again = Registered(failed, Now.AddDays(90));
        Assert.Equal(failed.Id, again.PreviousQualificationId);
    }

    [Fact]
    public void Missing_information_returns_the_qualification_to_the_expert()
    {
        var qualification = Registered();

        Decide(
            qualification,
            Results(
                new CompetencyResult(
                    "C3",
                    CompetencyCriteria.NeedMoreInformation,
                    "Send evidence review samples",
                    []
                )
            )
        );

        Assert.Equal(QualificationStatus.NeedMoreInformation, qualification.Status);
        Assert.Null(qualification.DecidedAt);
        var resubmitted = qualification.Resubmit(Applicant, "Added samples", Now.AddDays(1));
        Assert.Equal(QualificationStatus.CompetencyReview, qualification.Status);
        Assert.Equal(QualificationStatus.NeedMoreInformation, resubmitted.FromStatus);
        Assert.Equal(Now.AddDays(1), qualification.SubmittedAt);
    }

    [Fact]
    public void Every_competency_needs_a_note()
    {
        var results = Results(new CompetencyResult("C1", CompetencyCriteria.Pass, " ", [Cv]));

        Assert.Equal(
            "COMPETENCY_NOTE_REQUIRED",
            Errors.CodeOf(() => Decide(Registered(), results))
        );
    }

    [Fact]
    public void Pass_and_fail_must_cite_a_file_of_the_qualification()
    {
        var uncited = Results(new CompetencyResult("C5", CompetencyCriteria.Pass, "Good", []));
        var foreign = Results(
            new CompetencyResult("C5", CompetencyCriteria.Pass, "Good", [Guid.NewGuid()])
        );

        Assert.Equal(
            "COMPETENCY_EVIDENCE_REQUIRED",
            Errors.CodeOf(() => Decide(Registered(), uncited))
        );
        Assert.Equal(
            "COMPETENCY_EVIDENCE_UNKNOWN",
            Errors.CodeOf(() => Decide(Registered(), foreign))
        );
    }

    [Fact]
    public void Exactly_one_known_result_per_competency_is_required()
    {
        var missing = Results().Take(4).ToArray();
        var duplicated = Results().Append(Results()[0]).ToArray();
        var unknownResult = Results(new CompetencyResult("C1", "MAYBE", "?", [Cv]));

        Assert.Equal(
            "INVALID_COMPETENCY_CRITERIA",
            Errors.CodeOf(() => Decide(Registered(), missing))
        );
        Assert.Equal(
            "INVALID_COMPETENCY_CRITERIA",
            Errors.CodeOf(() => Decide(Registered(), duplicated))
        );
        Assert.Equal(
            "INVALID_COMPETENCY_RESULT",
            Errors.CodeOf(() => Decide(Registered(), unknownResult))
        );
    }

    [Fact]
    public void Only_qualifications_in_competency_review_can_be_decided()
    {
        var decided = Registered();
        Decide(decided, Results());

        Assert.Equal(
            "QUALIFICATION_NOT_IN_REVIEW",
            Errors.CodeOf(() => Decide(decided, Results()))
        );
    }

    [Fact]
    public void Reviewers_cannot_decide_their_own_qualification()
    {
        var error = Errors.CodeOf(() => Decide(Registered(), Results(), reviewer: Applicant));

        Assert.Equal("SELF_REVIEW_NOT_ALLOWED", error);
    }

    [Fact]
    public void Files_are_accepted_only_while_more_information_is_requested()
    {
        var qualification = Registered();
        Assert.Equal("QUALIFICATION_LOCKED", Errors.CodeOf(qualification.EnsureAcceptsFile));

        Decide(
            qualification,
            Results(new CompetencyResult("C1", CompetencyCriteria.NeedMoreInformation, "More", []))
        );
        qualification.EnsureAcceptsFile();
        var added = ExpertEvidence.CreateForQualification(
            qualification,
            Applicant,
            "sample.pdf",
            "application/pdf",
            10,
            Now.AddMinutes(5)
        );

        Assert.True(qualification.CanRemove(added));
        Assert.Equal(qualification.Id, added.QualificationId);
        Assert.Equal(qualification.ApplicationId, added.ApplicationId);
        qualification.Resubmit(Applicant, null, Now.AddMinutes(10));
        Assert.False(qualification.CanRemove(added));
    }
}
