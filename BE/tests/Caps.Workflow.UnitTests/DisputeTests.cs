using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class DisputeTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid ExpertUser = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid Admin = Guid.NewGuid();
    private const string Reason = "DELIVERABLE_INCOMPLETE";

    // Fee 1,000,000 with a 20% platform fee, delivered on time at Now: the client has 72h to accept
    private static ReviewCase Delivered()
    {
        var reviewCase = ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(Expert, ExpertUser),
                "Check my CIT return",
                null,
                Now.AddHours(-2)
            )
            .Case;
        reviewCase.ConfirmPayment(Now.AddHours(-2));
        reviewCase.Accept(Expert, ExpertUser, Now.AddHours(-1));
        reviewCase.Deliver(Expert, ExpertUser, ReviewCase.Verified, "All good", null, Now);
        return reviewCase;
    }

    private static (ReviewCase Case, ReviewDispute Dispute) Disputed()
    {
        var reviewCase = Delivered();
        var (dispute, _) = reviewCase.OpenDispute(
            Client,
            Reason,
            "The VAT part is missing",
            Now.AddHours(1)
        );
        return (reviewCase, dispute);
    }

    [Fact]
    public void The_client_disputes_a_delivery_and_auto_confirm_stops()
    {
        var reviewCase = Delivered();

        var (dispute, history) = reviewCase.OpenDispute(
            Client,
            Reason,
            "  The VAT part is missing  ",
            Now.AddHours(1)
        );

        Assert.Equal(ReviewCaseStatus.Disputed, reviewCase.Status);
        Assert.Equal(ReviewCaseStatus.AwaitingAcceptance, history.FromStatus);
        Assert.Equal(ReviewDispute.Open, dispute.Status);
        Assert.Equal("The VAT part is missing", dispute.Description);
        Assert.Equal(Now.AddHours(1) + ReviewDispute.DecisionWindow, dispute.DecideBy);
        // The expiry job only auto-confirms cases still awaiting acceptance
        Assert.Null(reviewCase.ExpireIfOverdue(Now.AddDays(30)));
    }

    [Fact]
    public void A_dispute_after_the_acceptance_window_is_rejected() =>
        Assert.Equal(
            "CASE_DEADLINE_PASSED",
            Errors.CodeOf(() =>
                Delivered().OpenDispute(Client, Reason, "Late", Now + ReviewCase.AcceptanceWindow)
            )
        );

    [Fact]
    public void Only_the_client_disputes() =>
        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() => Delivered().OpenDispute(ExpertUser, Reason, "Mine", Now))
        );

    [Fact]
    public void An_accepted_case_cannot_be_disputed()
    {
        var reviewCase = Delivered();
        reviewCase.Confirm(Client, Now.AddHours(1));

        Assert.Equal(
            "CASE_STATUS_INVALID",
            Errors.CodeOf(() => reviewCase.OpenDispute(Client, Reason, "Again", Now.AddHours(2)))
        );
    }

    [Theory]
    [InlineData("NOT_A_REASON", "Missing part", "DISPUTE_REASON_INVALID")]
    [InlineData(null, "Missing part", "DISPUTE_REASON_INVALID")]
    [InlineData(Reason, "  ", "TEXT_REQUIRED")]
    public void A_dispute_needs_a_known_reason_and_a_description(
        string? reason,
        string description,
        string code
    ) =>
        Assert.Equal(
            code,
            Errors.CodeOf(() => Delivered().OpenDispute(Client, reason, description, Now))
        );

    [Fact]
    public void The_expert_explains_once()
    {
        var (reviewCase, dispute) = Disputed();

        reviewCase.AddExpertStatement(dispute, Expert, "VAT was out of scope", Now.AddHours(2));

        Assert.Equal("VAT was out of scope", dispute.ExpertStatement);
        Assert.Equal(
            "DISPUTE_STATEMENT_EXISTS",
            Errors.CodeOf(() =>
                reviewCase.AddExpertStatement(dispute, Expert, "Again", Now.AddHours(3))
            )
        );
    }

    [Fact]
    public void Another_expert_cannot_explain()
    {
        var (reviewCase, dispute) = Disputed();

        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() =>
                reviewCase.AddExpertStatement(dispute, Guid.NewGuid(), "Not mine", Now)
            )
        );
    }

    [Fact]
    public void The_admin_extends_the_decision_window_once()
    {
        var (_, dispute) = Disputed();
        var due = dispute.DecideBy;

        dispute.Extend();

        Assert.Equal(due + ReviewDispute.DecisionWindow, dispute.DecideBy);
        Assert.Equal("DISPUTE_ALREADY_EXTENDED", Errors.CodeOf(dispute.Extend));
    }

    [Theory]
    [InlineData(40, 400_000, 120_000, 480_000)]
    [InlineData(100, 1_000_000, 0, 0)]
    [InlineData(0, 0, 200_000, 800_000)]
    public void The_admin_sets_the_refund_and_the_rest_splits_by_the_frozen_fee(
        short pct,
        long refund,
        long platform,
        long expert
    )
    {
        var (reviewCase, dispute) = Disputed();

        var history = reviewCase.ResolveDispute(
            dispute,
            Admin,
            pct,
            "Partly delivered",
            Now.AddHours(5)
        );

        Assert.Equal(ReviewCaseStatus.Resolved, reviewCase.Status);
        Assert.Equal(Admin, history.ActorUserId);
        Assert.Equal(ReviewDispute.Resolved, dispute.Status);
        Assert.Equal(pct, dispute.RefundPct);
        Assert.Equal(new ReviewSettlement(refund, platform, expert), reviewCase.Settle());
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void A_refund_outside_0_to_100_is_rejected(short pct)
    {
        var (reviewCase, dispute) = Disputed();

        Assert.Equal(
            "DISPUTE_REFUND_INVALID",
            Errors.CodeOf(() => reviewCase.ResolveDispute(dispute, Admin, pct, "Why", Now))
        );
    }

    [Fact]
    public void A_decision_needs_a_reason()
    {
        var (reviewCase, dispute) = Disputed();

        Assert.Equal(
            "TEXT_REQUIRED",
            Errors.CodeOf(() => reviewCase.ResolveDispute(dispute, Admin, 50, " ", Now))
        );
    }

    [Fact]
    public void Withdrawing_accepts_the_delivery_and_settles_as_usual()
    {
        var (reviewCase, dispute) = Disputed();

        reviewCase.WithdrawDispute(dispute, Client, Now.AddHours(2));

        Assert.Equal(ReviewCaseStatus.Completed, reviewCase.Status);
        Assert.Equal(ReviewDispute.Withdrawn, dispute.Status);
        Assert.Equal(new ReviewSettlement(0, 200_000, 800_000), reviewCase.Settle());
    }

    [Fact]
    public void A_closed_dispute_cannot_be_decided()
    {
        var (reviewCase, dispute) = Disputed();
        reviewCase.WithdrawDispute(dispute, Client, Now.AddHours(2));

        Assert.Equal(
            "CASE_STATUS_INVALID",
            Errors.CodeOf(() => reviewCase.ResolveDispute(dispute, Admin, 50, "Late", Now))
        );
        Assert.Equal("CASE_STATUS_INVALID", Errors.CodeOf(dispute.Extend));
    }

    [Fact]
    public void A_disputed_case_still_blocks_a_new_booking_of_the_version() =>
        Assert.Contains(ReviewCaseStatus.Disputed, ReviewCase.OpenStatuses);
}
