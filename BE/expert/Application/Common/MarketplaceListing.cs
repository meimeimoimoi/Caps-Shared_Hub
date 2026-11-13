using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Portal;

namespace Caps.Expert.Application.Common;

/// <summary>Applies BR-M01 to every candidate Expert–Service and groups the bookable ones by expert.</summary>
public sealed class MarketplaceListing(
    IQualificationRepository qualifications,
    IServiceOfferingRepository offerings,
    IServiceCatalogRepository catalog
) : IMarketplaceListing
{
    public async Task<IReadOnlyList<MarketplaceExpertResponse>> ListAsync(
        string? serviceCode,
        Guid? profileId,
        CancellationToken ct
    )
    {
        var candidates = await qualifications.ListMarketplaceCandidatesAsync(
            serviceCode,
            profileId,
            ct
        );
        if (candidates.Count == 0)
            return [];
        var profileIds = candidates.Select(x => x.ExpertProfileId).Distinct().ToArray();
        var prices = await offerings.ListAsync(profileIds, ct);
        var services = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code);

        return candidates
            .GroupBy(x => x.ExpertProfile)
            .Select(group =>
            {
                var profile = group.Key;
                var offers = group
                    .Select(q =>
                    {
                        var price = prices.FirstOrDefault(p =>
                            p.ExpertProfileId == profile.Id && p.ServiceCode == q.ServiceCode
                        );
                        var listed = MarketplaceRules.IsListed(
                            new(
                                q.Status,
                                profile.IsAccountActive,
                                services.ContainsKey(q.ServiceCode),
                                price != null,
                                q.AcceptingRequests,
                                profile.Capacity > 0
                            )
                        );
                        return listed
                            ? new MarketplaceServiceResponse(
                                q.ServiceCode,
                                services[q.ServiceCode].Name,
                                price!.Fee,
                                price.TurnaroundHours,
                                q.DecidedAt
                            )
                            : null;
                    })
                    .OfType<MarketplaceServiceResponse>()
                    .ToArray();
                return offers.Length == 0
                    ? null
                    : new MarketplaceExpertResponse(
                        profile.Id.ToString(),
                        profile.DisplayName,
                        profile.Title,
                        profile.Company,
                        profile.Location,
                        profile.YearsExperience,
                        profile.Fields,
                        profile.Bio,
                        profile.Highlights,
                        profile.RatingAvg,
                        profile.RatingCount,
                        offers,
                        profile.FreeSlots
                    );
            })
            .OfType<MarketplaceExpertResponse>()
            .OrderByDescending(x => x.FreeSlots > 0)
            .ThenByDescending(x => x.RatingAvg)
            .ToArray();
    }
}
