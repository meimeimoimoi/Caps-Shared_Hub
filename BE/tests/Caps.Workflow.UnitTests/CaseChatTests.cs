using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class CaseChatTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 1, 0, 0, TimeSpan.Zero);
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();

    private static ReviewCase Case(string status = "IN_REVIEW") =>
        new()
        {
            RequesterUserId = Client,
            ExpertUserId = Expert,
            Status = status,
        };

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
    [InlineData("COMPLETED")]
    [InlineData("TERMINATED")]
    [InlineData("EXPERT_DECLINED")]
    [InlineData("REQUEST_EXPIRED")]
    public void An_ended_case_takes_no_messages(string status) =>
        Assert.Equal(
            "CHAT_CLOSED",
            Errors.CodeOf(() => CaseMessage.Post(Case(status), Client, "Hi", Now))
        );

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
