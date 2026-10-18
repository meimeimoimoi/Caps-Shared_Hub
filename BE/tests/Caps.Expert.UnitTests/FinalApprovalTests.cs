using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Qualifications;

namespace Caps.Expert.UnitTests;

public sealed class FinalApprovalTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Reviewer = Guid.NewGuid();
    private static readonly Guid Admin = Guid.NewGuid();
    private static readonly Guid Cv = Guid.NewGuid();

    private static ExpertApplication Eligible()
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
        return application;
    }

    private static CompetencyResult[] All(string result) =>
        CompetencyCriteria
            .Codes.Select(code => new CompetencyResult(code, result, "note", [Cv]))
            .ToArray();

    private static ExpertServiceQualification Decided(string result)
    {
        var q = ExpertServiceQualification
            .Register(Eligible(), "HUMAN_VERIFICATION", null, Expert, Now)
            .Qualification;
        q.DecideCompetency(
            Reviewer,
            Expert,
            All(result),
            new HashSet<Guid> { Cv },
            null,
            new(TimeSpan.FromDays(90)),
            Now
        );
        return q;
    }

    [Fact]
    public void Approval_by_another_admin_grants_the_service()
    {
        var q = Decided(CompetencyCriteria.Pass);

        var approved = q.DecideFinalApproval(
            Admin,
            Expert,
            FinalApprovalDecision.Approve,
            null,
            Now.AddDays(1)
        );

        Assert.Equal(QualificationStatus.ApprovedForService, q.Status);
        Assert.Equal(Admin, approved.ActorUserId);
        Assert.Equal(QualificationStatus.PendingFinalApproval, approved.FromStatus);
    }

    [Fact]
    public void The_gate_2_reviewer_cannot_give_the_final_approval()
    {
        var q = Decided(CompetencyCriteria.Pass);

        var error = Errors.CodeOf(() =>
            q.DecideFinalApproval(Reviewer, Expert, FinalApprovalDecision.Approve, null, Now)
        );

        Assert.Equal("FINAL_APPROVER_IS_REVIEWER", error);
    }

    [Fact]
    public void Returning_for_review_needs_a_note_and_clears_the_gate_2_result()
    {
        var q = Decided(CompetencyCriteria.Pass);
        Assert.Equal(
            "FINAL_APPROVAL_NOTE_REQUIRED",
            Errors.CodeOf(() =>
                q.DecideFinalApproval(
                    Admin,
                    Expert,
                    FinalApprovalDecision.ReturnForReview,
                    " ",
                    Now
                )
            )
        );

        q.DecideFinalApproval(
            Admin,
            Expert,
            FinalApprovalDecision.ReturnForReview,
            "C3 evidence is unclear",
            Now
        );

        Assert.Equal(QualificationStatus.CompetencyReview, q.Status);
        Assert.Null(q.CompetencyReviewerUserId);
        Assert.Null(q.DecidedAt);
    }

    [Fact]
    public void Only_a_gate_2_pass_can_be_finally_approved()
    {
        var needsMore = Decided(CompetencyCriteria.NeedMoreInformation);

        Assert.Equal(
            "QUALIFICATION_NOT_PENDING_APPROVAL",
            Errors.CodeOf(() =>
                needsMore.DecideFinalApproval(
                    Admin,
                    Expert,
                    FinalApprovalDecision.Approve,
                    null,
                    Now
                )
            )
        );
    }

    [Fact]
    public void Unknown_decisions_and_self_approval_are_rejected()
    {
        var q = Decided(CompetencyCriteria.Pass);

        Assert.Equal(
            "INVALID_FINAL_APPROVAL_DECISION",
            Errors.CodeOf(() => q.DecideFinalApproval(Admin, Expert, "MAYBE", null, Now))
        );
        Assert.Equal(
            "SELF_REVIEW_NOT_ALLOWED",
            Errors.CodeOf(() =>
                q.DecideFinalApproval(Expert, Expert, FinalApprovalDecision.Approve, null, Now)
            )
        );
    }

    [Fact]
    public void A_re_registration_after_fail_waits_for_new_evidence()
    {
        var failed = Decided(CompetencyCriteria.Fail);

        var again = ExpertServiceQualification
            .Register(Eligible(), "HUMAN_VERIFICATION", failed, Expert, Now.AddDays(90))
            .Qualification;

        Assert.Equal(QualificationStatus.NeedMoreInformation, again.Status);
        Assert.True(again.AwaitsNewEvidence);
        again.Resubmit(Expert, null, Now.AddDays(91));
        Assert.False(again.AwaitsNewEvidence);
        Assert.Equal(QualificationStatus.CompetencyReview, again.Status);
    }
}
