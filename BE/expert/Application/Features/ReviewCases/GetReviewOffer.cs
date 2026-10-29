using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.ReviewCases;

/// <summary>The offer the workflow service books when a client requests a review.</summary>
public sealed record GetReviewOfferQuery(Guid ExpertProfileId, string ServiceCode);

/// <summary>
/// Bookable means listed on the Marketplace (the same BR-M01 check), so a client can never book what the
/// Marketplace would hide. The fee and late rule are the ones in force now; the case freezes them.
/// </summary>
public sealed class GetReviewOfferHandler(
    IMarketplaceListing listing,
    IExpertProfileRepository profiles,
    IServiceOfferingRepository offerings,
    IPlatformFeeRepository fees,
    TimeProvider clock
) : IQueryHandler<GetReviewOfferQuery, ReviewOfferResponse>
{
    public async Task<ReviewOfferResponse> HandleAsync(
        GetReviewOfferQuery query,
        CancellationToken ct
    )
    {
        var code = query.ServiceCode.Trim().ToUpperInvariant();
        var listed = await listing.ListAsync(code, query.ExpertProfileId, ct);
        if (!listed.Any(e => e.Services.Any(s => s.ServiceCode == code)))
        {
            throw ExpertErrors.ExpertNotBookable();
        }

        var profile = await profiles.FindAsync(query.ExpertProfileId, ct);
        var offering = await offerings.FindAsync(query.ExpertProfileId, code, ct);
        var fee = await fees.FindCurrentAsync(code, clock.GetUtcNow(), ct);
        if (profile == null || offering == null || fee == null)
        {
            throw ExpertErrors.ExpertNotBookable();
        }
        return new(
            profile.UserId,
            offering.Id,
            offering.Fee,
            offering.TurnaroundHours,
            fee.Percent,
            fee.LatePenaltyHours,
            fee.LatePenaltyPercent,
            fee.LateCancelHours,
            profile.FreeSlots
        );
    }
}
