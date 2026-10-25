using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Portal;

namespace Caps.Expert.Application.Common;

/// <summary>Applies BR-M01 to every candidate Expert–Service and groups the bookable ones by expert.</summary>
public sealed class MarketplaceListing(
    IQualificationRepository qualifications,
    IServiceOfferingRepository offerings,
    IAvailabilityRepository availability,
    IServiceCatalogRepository catalog,
    TimeProvider clock
) : IMarketplaceListing
{
    public async Task<IReadOnlyList<MarketplaceExpertResponse>> ListAsync(
        string? serviceCode,
        Guid? profileId,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var candidates = await qualifications.ListMarketplaceCandidatesAsync(
            serviceCode,
            profileId,
            ct
        );
        if (candidates.Count == 0)
            return [];
        var profileIds = candidates.Select(x => x.ExpertProfileId).Distinct().ToArray();
        var prices = await offerings.ListAsync(profileIds, ct);
        var slots = await availability.ListOpenAsync(profileIds, now, ct);
        var services = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code);

        return candidates
            .GroupBy(x => x.ExpertProfile)
            .Select(group =>
            {
                var profile = group.Key;
                var open = slots
                    .Where(x => x.ExpertProfileId == profile.Id && x.StartAt > now)
                    .OrderBy(x => x.StartAt)
                    .ToArray();
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
                                open.Length > 0
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
                        open.FirstOrDefault()?.StartAt,
                        open.Length
                    );
            })
            .OfType<MarketplaceExpertResponse>()
            .OrderByDescending(x => x.RatingAvg)
            .ThenBy(x => x.NextOpenSlotAt)
            .ToArray();
    }
}
