using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

// Each side sees only its own money, in VND; the platform's share and the percentages stay internal
public sealed class ReviewCaseResponseTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 30, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();

    [Fact]
    public void The_client_sees_what_comes_back_to_them()
    {
        // Fee 1,000,000 with P 20%, late refund 30%, no answer 50% back, no delivery 50% back
        var terms = ReviewCaseResponse.From(InReview(), Client).ClientTerms!;

        Assert.Equal(
            (300_000L, 500_000L, 500_000L, 0L, 500_000L),
            (
                terms.LateRefund,
                terms.NoDeliveryRefund,
                terms.NoResponseRefund,
                terms.AcceptRefund,
                terms.DisputeRefund
            )
        );
        Assert.Null(ReviewCaseResponse.From(InReview(), Client).ExpertTerms);
    }

    [Fact]
    public void The_expert_sees_only_their_payout()
    {
        var response = ReviewCaseResponse.From(InReview(), Expert);

        // A late refund above the platform fee comes out of the expert's share: 1,000,000 - 300,000
        Assert.Equal(
            (800_000L, 700_000L, 300_000L),
            (
                response.ExpertTerms!.Payout,
                response.ExpertTerms.LatePayout,
                response.ExpertTerms.NoResponsePayout
            )
        );
        Assert.Null(response.ClientTerms);
    }

    [Fact]
    public void The_settlement_shows_each_side_its_own_part()
    {
        var reviewCase = InReview();
        reviewCase.Deliver(
            ExpertProfile,
            Expert,
            ReviewCase.Verified,
            "Done",
            null,
            ["Article 9, CIT Law"],
            true,
            Now.AddHours(-1)
        );
        reviewCase.Confirm(Client, Now);

        Assert.Equal(
            new ReviewCaseResponse.SettlementResponse(0, null),
            ReviewCaseResponse.From(reviewCase, Client).Settlement
        );
        Assert.Equal(
            new ReviewCaseResponse.SettlementResponse(null, 800_000),
            ReviewCaseResponse.From(reviewCase, Expert).Settlement
        );
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
}
