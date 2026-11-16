using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class RatingTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 31, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();

    [Fact]
    public void The_client_rates_a_completed_case_once()
    {
        var reviewCase = Completed();

        reviewCase.Rate(Client, 4, "  Clear and fast  ", Now);

        Assert.Equal((short)4, reviewCase.Rating);
        Assert.Equal("Clear and fast", reviewCase.RatingComment);
        Assert.Equal(Now, reviewCase.RatedAt);
        Assert.Equal("RATING_EXISTS", Errors.CodeOf(() => reviewCase.Rate(Client, 5, null, Now)));
    }

    [Fact]
    public void A_comment_is_optional() => Assert.Null(Rated(Completed(), 5).RatingComment);

    [Theory]
    [InlineData(0)]
    [InlineData(6)]
    public void Stars_go_from_1_to_5(int stars) =>
        Assert.Equal(
            "RATING_INVALID",
            Errors.CodeOf(() => Completed().Rate(Client, stars, null, Now))
        );

    [Fact]
    public void Only_the_client_rates() =>
        Assert.Equal(
            "REVIEW_CASE_NOT_FOUND",
            Errors.CodeOf(() => Completed().Rate(Expert, 5, null, Now))
        );

    [Fact]
    public void A_running_case_cannot_be_rated() =>
        Assert.Equal("RATING_CLOSED", Errors.CodeOf(() => InReview().Rate(Client, 5, null, Now)));

    [Fact]
    public void A_decided_dispute_can_be_rated()
    {
        var reviewCase = InReview();
        reviewCase.Deliver(ExpertProfile, Expert, ReviewCase.Verified, "Done", null, Now);
        var (dispute, _) = reviewCase.OpenDispute(
            Client,
            "DELIVERABLE_INCOMPLETE",
            "VAT missing",
            Now
        );
        reviewCase.ResolveDispute(dispute, Guid.NewGuid(), 40, "Partly delivered", Now);

        Assert.Equal((short)2, Rated(reviewCase, 2).Rating);
    }

    private static ReviewCase Rated(ReviewCase reviewCase, int stars)
    {
        reviewCase.Rate(Client, stars, null, Now);
        return reviewCase;
    }

    private static ReviewCase InReview()
    {
        var reviewCase = ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(ExpertProfile, Expert),
                "Check my CIT return",
                null,
                Now.AddHours(-3)
            )
            .Case;
        reviewCase.ConfirmPayment(Now.AddHours(-3));
        reviewCase.Accept(ExpertProfile, Expert, Now.AddHours(-2));
        return reviewCase;
    }

    private static ReviewCase Completed()
    {
        var reviewCase = InReview();
        reviewCase.Deliver(
            ExpertProfile,
            Expert,
            ReviewCase.Verified,
            "Done",
            null,
            Now.AddHours(-1)
        );
        reviewCase.Confirm(Client, Now.AddHours(-1));
        return reviewCase;
    }
}
