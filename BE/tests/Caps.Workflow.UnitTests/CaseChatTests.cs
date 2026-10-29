using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class CaseChatTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 1, 0, 0, TimeSpan.Zero);
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();

    private static ReviewCase Requested() =>
        ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(ExpertProfile, Expert),
                "Check my CIT return",
                null,
                Now
            )
            .Case;

    // Paid and accepted: both parties can chat
    private static ReviewCase Case()
    {
        var reviewCase = Requested();
        reviewCase.ConfirmPayment(Now);
        reviewCase.Accept(ExpertProfile, Expert, Now);
        return reviewCase;
    }

    // Drives a case through the real steps to one of the statuses that close the chat
    private static ReviewCase Ended(string status)
    {
        var reviewCase = Requested();
        if (status == ReviewCaseStatus.CancelledUnpaid)
        {
            reviewCase.ExpireIfOverdue(Now.AddHours(1));
            return reviewCase;
        }
        reviewCase.ConfirmPayment(Now);
        if (status == ReviewCaseStatus.ExpertDeclined)
        {
            reviewCase.Decline(ExpertProfile, Expert, "Out of my field", Now);
            return reviewCase;
        }
        if (status == ReviewCaseStatus.ExpertTimeout)
        {
            reviewCase.ExpireIfOverdue(Now.AddDays(2));
            return reviewCase;
        }
        reviewCase.Accept(ExpertProfile, Expert, Now);
        if (status == ReviewCaseStatus.Terminated)
        {
            var (request, _) = reviewCase.RequestInformation(ExpertProfile, Expert, "More?", Now);
            reviewCase.TerminateForNoResponse(request, Now.AddDays(4));
            return reviewCase;
        }
        reviewCase.Deliver(ExpertProfile, Expert, ReviewCase.Verified, "Done", null, Now);
        if (status == ReviewCaseStatus.Completed)
        {
            reviewCase.Confirm(Client, Now);
        }
        else
        {
            reviewCase.ExpireIfOverdue(Now.AddDays(4));
        }
        return reviewCase;
    }

    [Fact]
    public void Each_party_posts_with_its_own_role()
    {
        var reviewCase = Case();

        var fromClient = CaseMessage.Post(reviewCase, Client, "  Hello  ", Now);
        var fromExpert = CaseMessage.Post(reviewCase, Expert, "Hi", Now);

        Assert.Equal(CaseParticipant.Client, fromClient.SenderRole);
        Assert.Equal("Hello", fromClient.Content);
        Assert.Equal(CaseParticipant.Expert, fromExpert.SenderRole);
        Assert.Equal(reviewCase.Id, fromExpert.ReviewCaseId);
    }

    [Fact]
    public void Someone_outside_the_case_is_told_it_does_not_exist() =>
        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() => CaseMessage.Post(Case(), Guid.NewGuid(), "Hi", Now))
        );

    [Theory]
    [InlineData(ReviewCaseStatus.CancelledUnpaid)]
    [InlineData(ReviewCaseStatus.ExpertDeclined)]
    [InlineData(ReviewCaseStatus.ExpertTimeout)]
    [InlineData(ReviewCaseStatus.Terminated)]
    [InlineData(ReviewCaseStatus.Completed)]
    [InlineData(ReviewCaseStatus.AutoConfirmed)]
    public void An_ended_case_takes_no_messages(string status)
    {
        var reviewCase = Ended(status);

        Assert.Equal(status, reviewCase.Status);
        Assert.Equal(
            "CHAT_CLOSED",
            Errors.CodeOf(() => CaseMessage.Post(reviewCase, Client, "Hi", Now))
        );
    }

    // Unpaid or not yet accepted: no free questions before the expert takes the case
    [Fact]
    public void Chat_opens_only_when_the_expert_accepts()
    {
        var reviewCase = Requested();
        Assert.Equal(
            "CHAT_CLOSED",
            Errors.CodeOf(() => CaseMessage.Post(reviewCase, Client, "Hi", Now))
        );

        reviewCase.ConfirmPayment(Now);
        Assert.Equal(
            "CHAT_CLOSED",
            Errors.CodeOf(() => CaseMessage.Post(reviewCase, Client, "Hi", Now))
        );

        reviewCase.Accept(ExpertProfile, Expert, Now);
        Assert.Equal("Hi", CaseMessage.Post(reviewCase, Client, "Hi", Now).Content);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void A_blank_message_is_rejected(string? content) =>
        Assert.Equal(
            "MESSAGE_EMPTY",
            Errors.CodeOf(() => CaseMessage.Post(Case(), Client, content, Now))
        );

    [Fact]
    public void A_message_over_the_limit_is_rejected() =>
        Assert.Equal(
            "MESSAGE_TOO_LONG",
            Errors.CodeOf(() =>
                CaseMessage.Post(Case(), Client, new string('a', CaseMessage.MaxLength + 1), Now)
            )
        );

    [Fact]
    public void The_read_marker_only_moves_forward()
    {
        var reviewCase = Case();
        var older = CaseMessage.Post(reviewCase, Expert, "first", Now);
        var newer = CaseMessage.Post(reviewCase, Expert, "second", Now.AddMinutes(1));
        var marker = CaseReadMarker.Start(reviewCase.Id, Client, newer, Now.AddMinutes(2));

        marker.MoveTo(older, Now.AddMinutes(3));

        Assert.Equal(newer.Id, marker.LastReadMessageId);
        Assert.Equal(newer.CreatedAt, marker.LastReadAt);
    }
}
