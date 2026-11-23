using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

// Before booking the client sees what each case would give back, from the offer the booking would freeze
public sealed class BookingTermsTests
{
    private static readonly Guid ExpertProfile = Guid.NewGuid();

    [Fact]
    public async Task The_client_sees_the_money_of_the_offer_before_booking()
    {
        // Fee 1,000,000 with P 20%, late refund 30%, no answer 50% back, no delivery 50% back
        var terms = await new GetBookingTermsHandler(
            new Offerings(Offers.Sample(ExpertProfile, Guid.NewGuid()))
        ).HandleAsync(new(ExpertProfile, "HUMAN_VERIFICATION"), default);

        Assert.Equal(
            (24, 72, 3, 300_000L, 500_000L, 500_000L, 0L, 500_000L),
            (
                terms.LatePenaltyHours,
                terms.LateCancelHours,
                terms.NoResponseDays,
                terms.LateRefund,
                terms.NoDeliveryRefund,
                terms.NoResponseRefund,
                terms.AcceptRefund,
                terms.DisputeRefund
            )
        );
    }

    [Fact]
    public async Task An_expert_who_does_not_sell_the_service_has_no_terms()
    {
        var e = await Assert.ThrowsAsync<AppException>(() =>
            new GetBookingTermsHandler(new Offerings(null)).HandleAsync(
                new(ExpertProfile, "HUMAN_VERIFICATION"),
                default
            )
        );

        Assert.Equal("EXPERT_SERVICE_UNAVAILABLE", e.Code);
    }

    [Fact]
    public void A_late_refund_above_the_platform_fee_comes_out_of_the_expert_share()
    {
        Assert.Equal(
            new ReviewSettlement(300_000, 0, 700_000),
            ReviewSettlement.Delivered(1_000_000, 20, 30)
        );
        Assert.Equal(
            new ReviewSettlement(200_000, 200_000, 600_000),
            ReviewSettlement.Delivered(1_000_000, 40, 20)
        );
    }

    private sealed class Offerings(ReviewOffer? offer) : IExpertOfferings
    {
        public Task<ReviewOffer?> FindAsync(
            Guid expertProfileId,
            string serviceCode,
            CancellationToken ct
        ) => Task.FromResult(offer);
    }
}
