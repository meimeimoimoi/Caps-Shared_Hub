using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Features.Profiles;

/// <summary>The signed-in expert's own public profile.</summary>
public sealed record GetMyBioQuery(Applicant Applicant);

/// <summary>
/// The public profile as clients see it on the marketplace, also while the expert is not listed (then
/// without services or rating), so the expert can prepare it before going live.
/// </summary>
public sealed class GetMyBioHandler(IExpertProfileRepository profiles, IMarketplaceListing listing)
    : IQueryHandler<GetMyBioQuery, MarketplaceExpertResponse>
{
    public async Task<MarketplaceExpertResponse> HandleAsync(
        GetMyBioQuery query,
        CancellationToken ct
    )
    {
        query.Applicant.EnsureVerified();
        var profile =
            await profiles.FindByUserAsync(query.Applicant.UserId, ct)
            ?? throw ExpertErrors.ExpertNotFound();
        return await ViewAsync(profile, listing, ct);
    }

    /// <summary>The marketplace card when listed, otherwise the profile alone.</summary>
    internal static async Task<MarketplaceExpertResponse> ViewAsync(
        ExpertProfile profile,
        IMarketplaceListing listing,
        CancellationToken ct
    )
    {
        var listed = await listing.ListAsync(null, profile.Id, ct);
        return listed.Count > 0
            ? listed[0]
            : new(
                profile.Id.ToString(),
                MarketplaceListing.AvatarPath(profile.UserId),
                profile.DisplayName,
                profile.Title,
                profile.Company,
                profile.Location,
                profile.YearsExperience,
                profile.Fields,
                profile.Bio,
                profile.Highlights,
                0,
                0,
                [],
                0
            );
    }
}
