using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class ReviewCaseTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid ExpertUser = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();

    private static ReviewCase NewCase(
        long fee = 1_000_000,
        int pct = 20,
        int hours = 48,
        int penaltyHours = 24,
        int penaltyPct = 30,
        int cancelHours = 72,
        int silenceHours = 72,
        int silenceRefund = 50,
        int silenceExpert = 30
    ) =>
        ReviewCase
            .Request(
                Client,
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(
                    Expert,
                    ExpertUser,
                    fee,
                    (short)pct,
                    hours,
                    penaltyHours,
                    (short)penaltyPct,
                    cancelHours,
                    silenceHours,
                    (short)silenceRefund,
                    (short)silenceExpert
                ),
                "Check my CIT return",
                null,
                Now
            )
            .Case;

    // Paid at Now: the expert must answer by Now + 24h
    private static ReviewCase Paid()
    {
        var reviewCase = NewCase();
        reviewCase.ConfirmPayment(Now);
        return reviewCase;
    }

    // Accepted at Now with a 48h turnaround: delivery due at Now + 48h
    private static ReviewCase InReview()
    {
        var reviewCase = Paid();
        reviewCase.Accept(Expert, ExpertUser, Now);
        return reviewCase;
    }

    [Fact]
    public void Happy_path_sets_every_deadline()
    {
        var reviewCase = NewCase();
        Assert.Equal(ReviewCaseStatus.AwaitingPayment, reviewCase.Status);
        Assert.Equal(Now.AddMinutes(15), reviewCase.PaymentDeadline);

        reviewCase.ConfirmPayment(Now.AddMinutes(5));
        Assert.Equal(ReviewCaseStatus.PendingExpertResponse, reviewCase.Status);
        Assert.Equal(Now.AddMinutes(5).AddHours(24), reviewCase.ResponseDeadline);

        reviewCase.Accept(Expert, ExpertUser, Now.AddHours(1));
        Assert.Equal(ReviewCaseStatus.InReview, reviewCase.Status);
        Assert.Equal(Now.AddHours(49), reviewCase.DeliveryDeadline);

        reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "All good",
            null,
            Now.AddHours(10)
        );
        Assert.Equal(Now.AddHours(82), reviewCase.AcceptanceDeadline);

        var history = reviewCase.Confirm(Client, Now.AddHours(11));
        Assert.Equal(ReviewCaseStatus.AwaitingAcceptance, history.FromStatus);
        Assert.Equal(ReviewCaseStatus.Completed, reviewCase.Status);
    }

    [Fact]
    public void Request_freezes_the_offer_and_records_the_opening()
    {
        var offer = Offers.Sample(Expert, ExpertUser);
        var (reviewCase, opened) = ReviewCase.Request(
            Client,
            Guid.NewGuid(),
            Guid.NewGuid(),
            offer,
            "  Check my CIT return  ",
            "   ",
            Now
        );

        Assert.Equal(offer.ServiceOfferingId, reviewCase.ServiceOfferingId);
        Assert.Equal(48, reviewCase.TurnaroundHours);
        Assert.Equal("Check my CIT return", reviewCase.ProblemDescription);
        Assert.Null(reviewCase.ExpectedOutcome);
        Assert.Null(opened.FromStatus);
        Assert.Equal(ReviewCaseStatus.AwaitingPayment, opened.ToStatus);
    }

    [Theory]
    [InlineData(0, 20, 48)]
    [InlineData(1_000_000, -1, 48)]
    [InlineData(1_000_000, 100, 48)]
    [InlineData(1_000_000, 20, 0)]
    [InlineData(1_000_000, 20, 721)]
    public void Invalid_offer_is_rejected(long fee, int pct, int hours) =>
        Assert.Equal("CASE_OFFER_INVALID", Errors.CodeOf(() => NewCase(fee, pct, hours)));

    [Theory]
    [InlineData(null)]
    [InlineData("   ")]
    public void Problem_description_is_required(string? text) =>
        Assert.Equal(
            "TEXT_REQUIRED",
            Errors.CodeOf(() =>
                ReviewCase.Request(
                    Client,
                    Guid.NewGuid(),
                    Guid.NewGuid(),
                    Offers.Sample(Expert, ExpertUser),
                    text,
                    null,
                    Now
                )
            )
        );

    [Fact]
    public void Another_expert_gets_not_found() =>
        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() => Paid().Accept(Guid.NewGuid(), ExpertUser, Now))
        );

    [Fact]
    public void Expert_cannot_accept_before_payment() =>
        Assert.Equal(
            "CASE_STATUS_INVALID",
            Errors.CodeOf(() => NewCase().Accept(Expert, ExpertUser, Now))
        );

    [Fact]
    public void Another_user_cannot_confirm()
    {
        var reviewCase = InReview();
        reviewCase.Deliver(Expert, ExpertUser, ReviewCase.Verified, "All good", null, Now);

        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() => reviewCase.Confirm(Guid.NewGuid(), Now))
        );
    }

    [Fact]
    public void Accepting_after_the_response_deadline_is_rejected() =>
        Assert.Equal(
            "CASE_DEADLINE_PASSED",
            Errors.CodeOf(() => Paid().Accept(Expert, ExpertUser, Now.AddHours(24)))
        );

    [Fact]
    public void Paying_twice_is_rejected() =>
        Assert.Equal("CASE_STATUS_INVALID", Errors.CodeOf(() => Paid().ConfirmPayment(Now)));

    [Fact]
    public void Late_payment_is_rejected_so_billing_refunds_it() =>
        Assert.Equal(
            "CASE_DEADLINE_PASSED",
            Errors.CodeOf(() => NewCase().ConfirmPayment(Now.AddMinutes(15)))
        );

    [Fact]
    public void Decline_needs_a_reason() =>
        Assert.Equal(
            "TEXT_REQUIRED",
            Errors.CodeOf(() => Paid().Decline(Expert, ExpertUser, " ", Now))
        );

    [Fact]
    public void Decline_keeps_the_reason()
    {
        var reviewCase = Paid();

        reviewCase.Decline(Expert, ExpertUser, "Out of my field", Now);

        Assert.Equal(ReviewCaseStatus.ExpertDeclined, reviewCase.Status);
        Assert.Equal("Out of my field", reviewCase.DeclineReason);
    }

    [Fact]
    public void Cannot_verify_needs_a_reason() =>
        Assert.Equal(
            "TEXT_REQUIRED",
            Errors.CodeOf(() =>
                InReview()
                    .Deliver(Expert, ExpertUser, ReviewCase.CannotVerify, "Summary", null, Now)
            )
        );

    [Fact]
    public void Unknown_result_is_rejected() =>
        Assert.Equal(
            "REVIEW_RESULT_INVALID",
            Errors.CodeOf(() =>
                InReview().Deliver(Expert, ExpertUser, "MAYBE", "Summary", null, Now)
            )
        );

    [Fact]
    public void Failed_delivery_leaves_the_case_unchanged()
    {
        var reviewCase = InReview();

        Errors.CodeOf(() =>
            reviewCase.Deliver(Expert, ExpertUser, ReviewCase.CannotVerify, "Summary", null, Now)
        );

        Assert.Equal(ReviewCaseStatus.InReview, reviewCase.Status);
        Assert.Null(reviewCase.ReviewSummary);
    }

    [Fact]
    public void Unpaid_case_is_cancelled_once_after_15_minutes()
    {
        var reviewCase = NewCase();

        Assert.Null(reviewCase.ExpireIfOverdue(Now.AddMinutes(14)));
        Assert.Equal(
            ReviewCaseStatus.CancelledUnpaid,
            reviewCase.ExpireIfOverdue(Now.AddMinutes(15))?.ToStatus
        );
        Assert.Null(reviewCase.ExpireIfOverdue(Now.AddHours(1))); // a second cron run changes nothing
    }

    [Fact]
    public void Paid_request_the_expert_never_answers_times_out()
    {
        var reviewCase = Paid();

        Assert.Null(reviewCase.ExpireIfOverdue(Now.AddHours(23)));
        Assert.Equal(
            ReviewCaseStatus.ExpertTimeout,
            reviewCase.ExpireIfOverdue(Now.AddHours(24))?.ToStatus
        );
    }

    [Fact]
    public void Delivery_is_auto_confirmed_after_72_hours()
    {
        var reviewCase = InReview();
        reviewCase.Deliver(Expert, ExpertUser, ReviewCase.Verified, "All good", null, Now);

        reviewCase.ExpireIfOverdue(Now.AddHours(72));

        Assert.Equal(ReviewCaseStatus.AutoConfirmed, reviewCase.Status);
        Assert.Equal(Now.AddHours(72), reviewCase.CompletedAt);
    }

    [Fact]
    public void Case_in_review_times_out_only_past_the_late_cancel_hours()
    {
        // Due at Now + 48h, cancelled from Now + 48h + 72h
        Assert.Null(InReview().ExpireIfOverdue(Now.AddHours(119)));

        var reviewCase = InReview();
        reviewCase.ExpireIfOverdue(Now.AddHours(120));
        Assert.Equal(ReviewCaseStatus.DeliveryOverdue, reviewCase.Status);
    }

    [Fact]
    public void Answer_in_time_resumes_review_and_pushes_the_delivery_deadline()
    {
        var reviewCase = InReview();
        var (request, _) = reviewCase.RequestInformation(
            Expert,
            ExpertUser,
            "Send the invoices",
            Now
        );

        reviewCase.ProvideInformation(request, Client, "Attached", Now.AddHours(10));

        Assert.Equal(ReviewCaseStatus.InReview, reviewCase.Status);
        Assert.Equal(Now.AddHours(58), reviewCase.DeliveryDeadline);
        Assert.Equal(InfoRequest.Answered, request.Status);
    }

    [Fact]
    public void Late_answer_is_rejected()
    {
        var reviewCase = InReview();
        var (request, _) = reviewCase.RequestInformation(
            Expert,
            ExpertUser,
            "Send the invoices",
            Now
        );

        Assert.Equal(
            "CASE_DEADLINE_PASSED",
            Errors.CodeOf(() =>
                reviewCase.ProvideInformation(request, Client, "Late", Now.AddHours(72))
            )
        );
    }

    [Fact]
    public void Silence_terminates_the_case_for_user_non_response()
    {
        var reviewCase = InReview();
        var (request, _) = reviewCase.RequestInformation(
            Expert,
            ExpertUser,
            "Send the invoices",
            Now
        );

        Assert.Null(reviewCase.TerminateForNoResponse(request, Now.AddHours(71)));
        reviewCase.TerminateForNoResponse(request, Now.AddHours(72));

        Assert.Equal(ReviewCaseStatus.Terminated, reviewCase.Status);
        Assert.Equal(ReviewCase.UserNonResponse, reviewCase.TerminationReason);
        Assert.Null(reviewCase.TerminateForNoResponse(request, Now.AddHours(96))); // second run is a no-op
    }

    [Fact]
    public void A_silent_client_gets_the_shares_frozen_at_booking()
    {
        var reviewCase = InReview();
        var (request, _) = reviewCase.RequestInformation(
            Expert,
            ExpertUser,
            "Send the invoices",
            Now
        );
        reviewCase.TerminateForNoResponse(request, Now.AddHours(72));

        // 50% back to the client, 30% to the expert, the platform keeps the remaining 20%
        Assert.Equal(new ReviewSettlement(500_000, 200_000, 300_000), reviewCase.Settle());
    }

    [Fact]
    public void The_answer_deadline_uses_the_hours_frozen_at_booking()
    {
        var reviewCase = NewCase(silenceHours: 24);
        reviewCase.ConfirmPayment(Now);
        reviewCase.Accept(Expert, ExpertUser, Now);
        var (request, _) = reviewCase.RequestInformation(
            Expert,
            ExpertUser,
            "Send the invoices",
            Now
        );

        Assert.Null(reviewCase.TerminateForNoResponse(request, Now.AddHours(23)));
        Assert.NotNull(reviewCase.TerminateForNoResponse(request, Now.AddHours(24)));
    }

    [Theory]
    [InlineData(0, 50, 30)] // no hours
    [InlineData(721, 50, 30)] // past the cap
    [InlineData(72, -1, 30)] // negative share
    [InlineData(72, 80, 30)] // client + expert over 100%
    public void Invalid_no_response_rule_is_rejected(int hours, int refund, int expert) =>
        Assert.Equal(
            "CASE_OFFER_INVALID",
            Errors.CodeOf(() =>
                NewCase(silenceHours: hours, silenceRefund: refund, silenceExpert: expert)
            )
        );

    [Fact]
    public void Expert_cannot_book_their_own_service() =>
        Assert.Equal(
            "CASE_SELF_REVIEW",
            Errors.CodeOf(() =>
                ReviewCase.Request(
                    ExpertUser,
                    Guid.NewGuid(),
                    Guid.NewGuid(),
                    Offers.Sample(Expert, ExpertUser),
                    "Check my CIT return",
                    null,
                    Now
                )
            )
        );

    [Fact]
    public void Expert_sees_the_case_only_once_it_is_paid()
    {
        var reviewCase = NewCase();
        reviewCase.EnsureVisibleTo(Client); // the client always sees it
        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() => reviewCase.EnsureVisibleTo(ExpertUser))
        );

        reviewCase.ConfirmPayment(Now);
        reviewCase.EnsureVisibleTo(ExpertUser); // paid: now visible
        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() => reviewCase.EnsureVisibleTo(Guid.NewGuid()))
        );
    }

    [Theory]
    [InlineData(48, 0, 0, 200_000, 800_000)] // on time
    [InlineData(58, 30, 300_000, 200_000, 500_000)] // 10h late
    [InlineData(72, 30, 300_000, 200_000, 500_000)] // exactly at the end of the penalty band
    [InlineData(78, 100, 1_000_000, 0, 0)] // 30h late
    public void Late_delivery_moves_the_experts_share_back_to_the_client(
        int deliveredAfterHours,
        int refundPct,
        long refund,
        long platform,
        long expert
    )
    {
        var reviewCase = InReview();
        reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "Done",
            null,
            Now.AddHours(deliveredAfterHours)
        );

        Assert.Equal(refundPct, reviewCase.LateRefundPct);
        Assert.Equal(new ReviewSettlement(refund, platform, expert), reviewCase.Settle());
    }

    [Fact]
    public void Delivery_past_the_late_cancel_hours_is_rejected() =>
        Assert.Equal(
            "CASE_DEADLINE_PASSED",
            Errors.CodeOf(() =>
                InReview()
                    .Deliver(
                        Expert,
                        ExpertUser,
                        ReviewCase.Verified,
                        "Done",
                        null,
                        Now.AddHours(120)
                    )
            )
        );

    [Fact]
    public void The_expert_may_ask_for_information_twice()
    {
        var reviewCase = InReview();
        for (var i = 0; i < ReviewCase.MaxInfoRequests; i++)
        {
            var (request, _) = reviewCase.RequestInformation(
                Expert,
                ExpertUser,
                "More please",
                Now
            );
            reviewCase.ProvideInformation(request, Client, "Here", Now);
        }

        Assert.Equal(
            "INFO_REQUEST_LIMIT",
            Errors.CodeOf(() => reviewCase.RequestInformation(Expert, ExpertUser, "Again", Now))
        );
    }

    [Theory]
    [InlineData(20, -1, 30, 72)] // negative hours
    [InlineData(20, 24, 81, 72)] // penalty + platform fee over 100%
    [InlineData(20, 24, 30, 23)] // cancel before the penalty band ends
    [InlineData(20, 24, 30, 721)] // past the cap
    public void Invalid_late_rule_is_rejected(
        int pct,
        int penaltyHours,
        int penaltyPct,
        int cancelHours
    ) =>
        Assert.Equal(
            "CASE_OFFER_INVALID",
            Errors.CodeOf(() =>
                NewCase(
                    pct: pct,
                    penaltyHours: penaltyHours,
                    penaltyPct: penaltyPct,
                    cancelHours: cancelHours
                )
            )
        );
}
