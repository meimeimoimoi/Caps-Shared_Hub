using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class ReviewCaseTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid ExpertUser = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();

    private static ReviewCase NewCase(long fee = 1_000_000, int pct = 20, int hours = 48) =>
        ReviewCase
            .Request(
                Client,
                Guid.NewGuid(),
                Guid.NewGuid(),
                new ReviewOffer(Expert, ExpertUser, Guid.NewGuid(), fee, (short)pct, hours),
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
        var offer = new ReviewOffer(Expert, ExpertUser, Guid.NewGuid(), 1_000_000, 20, 48);
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
                    new ReviewOffer(Expert, ExpertUser, Guid.NewGuid(), 1_000_000, 20, 48),
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
    public void Case_in_review_has_no_timeout() =>
        Assert.Null(InReview().ExpireIfOverdue(Now.AddDays(30)));

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
}
