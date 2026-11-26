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
        int silenceDays = 3,
        int silenceRefund = 50,
        int silenceExpert = 30
    ) =>
        ReviewCase
            .Request(
                Client,
                "client@caps.test",
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
                    silenceDays,
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
        // One working day: Wednesday at the same time
        Assert.Equal(Now.AddMinutes(5).AddHours(24), reviewCase.ResponseDeadline);

        reviewCase.Accept(Expert, ExpertUser, Now.AddHours(1));
        Assert.Equal(ReviewCaseStatus.InReview, reviewCase.Status);
        // One working day whatever turnaround the expert advertised (48h in the sample offer)
        Assert.Equal(Now.AddHours(25), reviewCase.DeliveryDeadline);

        reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "All good",
            null,
            ["Article 9, CIT Law"],
            true,
            Now.AddHours(10)
        );
        Assert.Equal(Now.AddHours(34), reviewCase.AcceptanceDeadline);

        var history = reviewCase.Confirm(Client, Now.AddHours(11));
        Assert.Equal(ReviewCaseStatus.AwaitingAcceptance, history.FromStatus);
        Assert.Equal(ReviewCaseStatus.Completed, reviewCase.Status);
    }

    [Fact]
    public void Request_freezes_the_offer_and_records_the_opening()
    {
        var offer = Offers.Sample(Expert, ExpertUser) with { ExpertEmail = "expert@caps.test" };
        var (reviewCase, opened) = ReviewCase.Request(
            Client,
            "client@caps.test",
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
        // Kept so the client can be emailed when the expert later asks them something
        Assert.Equal("client@caps.test", reviewCase.RequesterEmail);
        // Kept so the expert is emailed on the new request and the response reminder
        Assert.Equal("expert@caps.test", reviewCase.ExpertEmail);
        // Kept so suspending the service refunds only that service's waiting requests
        Assert.Equal("HUMAN_VERIFICATION", reviewCase.ServiceCode);
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
                    "client@caps.test",
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
        reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "All good",
            null,
            ["Article 9, CIT Law"],
            true,
            Now
        );

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
    public void A_full_expert_closes_a_waiting_request_as_declined_by_the_system()
    {
        var reviewCase = Paid();

        var history = reviewCase.CloseUnanswered(ReviewCase.ExpertFull, Now);

        Assert.Equal(ReviewCaseStatus.ExpertDeclined, reviewCase.Status);
        Assert.Equal(ReviewCase.ExpertFull, reviewCase.DeclineReason);
        Assert.Null(history.ActorUserId);
    }

    [Fact]
    public void Only_a_waiting_request_closes_for_a_full_expert() =>
        Assert.Equal(
            "CASE_STATUS_INVALID",
            Errors.CodeOf(() => InReview().CloseUnanswered(ReviewCase.ExpertFull, Now))
        );

    [Fact]
    public void Cannot_verify_needs_a_reason() =>
        Assert.Equal(
            "TEXT_REQUIRED",
            Errors.CodeOf(() =>
                InReview()
                    .Deliver(
                        Expert,
                        ExpertUser,
                        ReviewCase.CannotVerify,
                        "Summary",
                        null,
                        ["Article 9, CIT Law"],
                        true,
                        Now
                    )
            )
        );

    [Fact]
    public void Delivery_records_the_citations_and_the_attestation()
    {
        var reviewCase = InReview();

        var history = reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "All good",
            null,
            [" Article 9, CIT Law ", ""],
            true,
            Now
        );

        Assert.Equal(["Article 9, CIT Law"], reviewCase.Citations);
        Assert.Equal(ReviewCase.AttestationNote, history.Note);
    }

    [Fact]
    public void A_verified_result_needs_a_citation() =>
        Assert.Equal(
            "CITATIONS_INVALID",
            Errors.CodeOf(() =>
                InReview()
                    .Deliver(Expert, ExpertUser, ReviewCase.Verified, "Ok", null, [" "], true, Now)
            )
        );

    [Fact]
    public void Delivery_without_the_attestation_is_rejected() =>
        Assert.Equal(
            "ATTESTATION_REQUIRED",
            Errors.CodeOf(() =>
                InReview()
                    .Deliver(
                        Expert,
                        ExpertUser,
                        ReviewCase.CannotVerify,
                        "Ok",
                        "No data",
                        null,
                        false,
                        Now
                    )
            )
        );

    [Fact]
    public void Unknown_result_is_rejected() =>
        Assert.Equal(
            "REVIEW_RESULT_INVALID",
            Errors.CodeOf(() =>
                InReview()
                    .Deliver(
                        Expert,
                        ExpertUser,
                        "MAYBE",
                        "Summary",
                        null,
                        ["Article 9, CIT Law"],
                        true,
                        Now
                    )
            )
        );

    [Fact]
    public void Failed_delivery_leaves_the_case_unchanged()
    {
        var reviewCase = InReview();

        Errors.CodeOf(() =>
            reviewCase.Deliver(
                Expert,
                ExpertUser,
                ReviewCase.CannotVerify,
                "Summary",
                null,
                ["Article 9, CIT Law"],
                true,
                Now
            )
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
        reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "All good",
            null,
            ["Article 9, CIT Law"],
            true,
            Now
        );

        reviewCase.ExpireIfOverdue(Now.AddHours(72));

        Assert.Equal(ReviewCaseStatus.AutoConfirmed, reviewCase.Status);
        Assert.Equal(Now.AddHours(72), reviewCase.CompletedAt);
    }

    [Fact]
    public void Case_in_review_times_out_only_past_the_late_cancel_hours()
    {
        // Due Wednesday 15:00 (one working day); the 72 late hours skip the weekend: cancelled Monday 15:00.
        // Saturday (Now + 96h) is still inside the window
        Assert.Null(InReview().ExpireIfOverdue(Now.AddHours(96)));
        Assert.Null(InReview().ExpireIfOverdue(Now.AddHours(143)));

        var reviewCase = InReview();
        reviewCase.ExpireIfOverdue(Now.AddHours(144));
        Assert.Equal(ReviewCaseStatus.DeliveryOverdue, reviewCase.Status);
        // Nothing delivered: the client gets the frozen share (50 by default), the platform the rest
        Assert.Equal(new ReviewSettlement(500_000, 500_000, 0), reviewCase.Outcome());
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
        Assert.Equal(Now.AddHours(34), reviewCase.DeliveryDeadline);
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
    public void Questions_after_the_delivery_deadline_are_rejected()
    {
        var reviewCase = InReview();
        var late = reviewCase.DeliveryDeadline!.Value;

        Assert.Equal(
            "CASE_DEADLINE_PASSED",
            Errors.CodeOf(() =>
                reviewCase.RequestInformation(Expert, ExpertUser, "Late question", late)
            )
        );
        Assert.Equal(ReviewCaseStatus.InReview, reviewCase.Status);
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
    public void The_answer_deadline_uses_the_days_frozen_at_booking()
    {
        // Tuesday plus 1 working day is Wednesday, the same hour
        var reviewCase = NewCase(silenceDays: 1);
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
    [InlineData(0, 50, 30)] // no days
    [InlineData(31, 50, 30)] // past the cap
    [InlineData(3, -1, 30)] // negative share
    [InlineData(3, 80, 30)] // client + expert over 100%
    public void Invalid_no_response_rule_is_rejected(int days, int refund, int expert) =>
        Assert.Equal(
            "CASE_OFFER_INVALID",
            Errors.CodeOf(() =>
                NewCase(silenceDays: days, silenceRefund: refund, silenceExpert: expert)
            )
        );

    [Fact]
    public void Expert_cannot_book_their_own_service() =>
        Assert.Equal(
            "CASE_SELF_REVIEW",
            Errors.CodeOf(() =>
                ReviewCase.Request(
                    ExpertUser,
                    "client@caps.test",
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

    // Due one working day after acceptance (Now + 24h); fee 1,000,000, 20% platform fee, late rule 24h / 30%
    [Theory]
    [InlineData(24, 0, 0, 200_000, 800_000)] // on time
    [InlineData(34, 30, 300_000, 0, 700_000)] // 10h late: the refund exceeds the platform share, the expert covers the rest
    [InlineData(48, 30, 300_000, 0, 700_000)] // exactly at the end of the penalty band
    [InlineData(54, 100, 1_000_000, 0, 0)] // 30h late
    public void Late_delivery_refunds_the_client_from_the_platform_share(
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
            ["Article 9, CIT Law"],
            true,
            Now.AddHours(deliveredAfterHours)
        );

        Assert.Equal(refundPct, reviewCase.LateRefundPct);
        Assert.Equal(new ReviewSettlement(refund, platform, expert), reviewCase.Settle());
    }

    // Rule of 2026-11-20: 40% platform fee, 20% late refund → client 20%, platform 20%, expert 60%
    [Fact]
    public void Late_delivery_keeps_the_expert_share()
    {
        var reviewCase = NewCase(pct: 40, penaltyPct: 20);
        reviewCase.ConfirmPayment(Now);
        reviewCase.Accept(Expert, ExpertUser, Now);
        reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "Done",
            null,
            ["Article 9, CIT Law"],
            true,
            Now.AddHours(34)
        );

        Assert.Equal(new ReviewSettlement(200_000, 200_000, 600_000), reviewCase.Settle());
    }

    // Violations the expert service counts (2026-11-20): late +1, withdrew +2, never delivered +3
    [Theory]
    [InlineData(24, null)] // on time
    [InlineData(34, ReviewCase.LateViolation)]
    public void Only_a_late_delivery_counts_as_a_violation(int deliveredAfterHours, string? kind)
    {
        var reviewCase = InReview();
        var delivered = reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "Done",
            null,
            ["Article 9, CIT Law"],
            true,
            Now.AddHours(deliveredAfterHours)
        );

        Assert.Equal(kind, reviewCase.ViolationOf(delivered));
    }

    [Fact]
    public void Withdrawing_an_accepted_case_counts_as_a_violation()
    {
        var reviewCase = InReview();
        var withdrawn = reviewCase.WithdrawAccepted(
            Expert,
            ExpertUser,
            "Too busy",
            Now.AddHours(1)
        );

        Assert.Equal(ReviewCase.WithdrewViolation, reviewCase.ViolationOf(withdrawn));
    }

    [Fact]
    public void Never_delivering_counts_as_a_violation()
    {
        var reviewCase = InReview();
        // Due Wednesday 15:00, 72 working-day hours later is Monday 15:00
        var overdue = reviewCase.ExpireIfOverdue(Now.AddHours(144))!;

        Assert.Equal(ReviewCaseStatus.DeliveryOverdue, overdue.ToStatus);
        Assert.Equal(ReviewCase.NoDeliveryViolation, reviewCase.ViolationOf(overdue));
    }

    [Fact]
    public void Other_steps_are_not_violations()
    {
        var reviewCase = Paid();
        var accepted = reviewCase.Accept(Expert, ExpertUser, Now);

        Assert.Null(reviewCase.ViolationOf(accepted));
    }

    // Extension (2026-11-20): the expert asks once before the deadline, up to 2 working days; only the client's yes moves it.
    // InReview(): accepted Tuesday at Now, due Wednesday (Now + 24h); 2 more working days end on Friday (Now + 72h)
    [Fact]
    public void An_accepted_extension_moves_the_deadline_and_on_time_delivery_is_no_violation()
    {
        var reviewCase = InReview();
        reviewCase.RequestExtension(Expert, 2, "Client sent 300 more invoices", Now.AddHours(2));
        Assert.True(reviewCase.ExtensionPending);

        reviewCase.DecideExtension(Client, true, Now.AddHours(3));

        Assert.Equal(Now.AddHours(72), reviewCase.DeliveryDeadline);
        Assert.Equal(ReviewCase.ExtensionAccepted, reviewCase.ExtensionDecision);
        Assert.False(reviewCase.ExtensionPending);
        var delivered = reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "Done",
            null,
            ["Article 9, CIT Law"],
            true,
            Now.AddHours(60)
        );
        Assert.Null(reviewCase.ViolationOf(delivered));
        Assert.Equal(0, reviewCase.LateRefundPct);
    }

    [Fact]
    public void A_declined_extension_keeps_the_deadline()
    {
        var reviewCase = InReview();
        reviewCase.RequestExtension(Expert, 1, "Need one more day", Now.AddHours(2));

        reviewCase.DecideExtension(Client, false, Now.AddHours(3));

        Assert.Equal(Now.AddHours(24), reviewCase.DeliveryDeadline);
        Assert.Equal(ReviewCase.ExtensionDeclined, reviewCase.ExtensionDecision);
    }

    [Fact]
    public void An_extension_is_asked_once_per_case()
    {
        var reviewCase = InReview();
        reviewCase.RequestExtension(Expert, 1, "Need one more day", Now.AddHours(2));
        reviewCase.DecideExtension(Client, false, Now.AddHours(3));

        Assert.Equal(
            "EXTENSION_ALREADY_REQUESTED",
            Errors.CodeOf(() => reviewCase.RequestExtension(Expert, 1, "Again", Now.AddHours(4)))
        );
    }

    [Theory]
    [InlineData(0)]
    [InlineData(3)]
    public void An_extension_is_one_or_two_working_days(int days) =>
        Assert.Equal(
            "EXTENSION_DAYS_INVALID",
            Errors.CodeOf(() => InReview().RequestExtension(Expert, days, "Busy", Now.AddHours(2)))
        );

    [Fact]
    public void An_extension_cannot_be_asked_or_accepted_after_the_deadline()
    {
        Assert.Equal(
            "CASE_DEADLINE_PASSED",
            Errors.CodeOf(() => InReview().RequestExtension(Expert, 1, "Late", Now.AddHours(24)))
        );
        var reviewCase = InReview();
        reviewCase.RequestExtension(Expert, 1, "Need one more day", Now.AddHours(2));

        Assert.Equal(
            "CASE_DEADLINE_PASSED",
            Errors.CodeOf(() => reviewCase.DecideExtension(Client, true, Now.AddHours(24)))
        );
        Assert.Equal(Now.AddHours(24), reviewCase.DeliveryDeadline);
    }

    [Fact]
    public void Only_the_client_decides_a_pending_extension()
    {
        var reviewCase = InReview();
        Assert.Equal(
            "EXTENSION_NOT_PENDING",
            Errors.CodeOf(() => reviewCase.DecideExtension(Client, true, Now.AddHours(1)))
        );
        reviewCase.RequestExtension(Expert, 1, "Need one more day", Now.AddHours(2));

        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() => reviewCase.DecideExtension(Guid.NewGuid(), true, Now.AddHours(3)))
        );
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
                        ["Article 9, CIT Law"],
                        true,
                        Now.AddHours(144)
                    )
            )
        );

    [Fact]
    public void A_saved_draft_is_delivered_when_no_revision_is_sent()
    {
        var reviewCase = InReview();
        reviewCase.SaveRevision(Expert, """{"a":1}""", Now);
        reviewCase.Deliver(
            Expert,
            ExpertUser,
            ReviewCase.Verified,
            "Done",
            null,
            ["Article 9, CIT Law"],
            true,
            Now
        );

        Assert.Equal("""{"a":1}""", reviewCase.RevisedContent);
    }

    [Fact]
    public void A_draft_must_be_a_json_object() =>
        Assert.Equal(
            "REVISED_CONTENT_INVALID",
            Errors.CodeOf(() => InReview().SaveRevision(Expert, "[]", Now))
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
    [InlineData(20, 24, 101, 72)] // penalty over 100%
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
