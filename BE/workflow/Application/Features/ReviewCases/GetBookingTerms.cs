using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.ReviewCases;

/// <summary>The expert and service a client is about to book.</summary>
public sealed record GetBookingTermsQuery(Guid ExpertProfileId, string ServiceCode);

/// <summary>
/// What booking would cost the client in each case, in VND, from the offer the booking would freeze and the
/// same split as settlement; the platform fee and the expert's share stay internal.
/// </summary>
public sealed class GetBookingTermsHandler(IExpertOfferings offerings)
    : IQueryHandler<GetBookingTermsQuery, ReviewCaseResponse.ClientTermsResponse>
{
    public async Task<ReviewCaseResponse.ClientTermsResponse> HandleAsync(
        GetBookingTermsQuery query,
        CancellationToken ct
    )
    {
        var offer =
            await offerings.FindAsync(query.ExpertProfileId, query.ServiceCode, ct)
            ?? throw WorkflowErrors.ExpertServiceUnavailable();
        return new(
            offer.LatePenaltyHours,
            offer.LateCancelHours,
            offer.NoResponseDays,
            ReviewSettlement
                .Delivered(offer.Fee, offer.PlatformFeePct, offer.LatePenaltyPct)
                .ClientRefund,
            offer.Fee * offer.NoDeliveryRefundPct / 100,
            offer.Fee * offer.NoResponseRefundPct / 100,
            // Nothing is delivered yet, so accpeting has no refund to show
            0,
            offer.Fee * ReviewCase.DisputeUpheldRefundPct / 100
        );
    }
}
