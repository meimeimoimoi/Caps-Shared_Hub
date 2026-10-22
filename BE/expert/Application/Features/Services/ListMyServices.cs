using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Services;

/// <summary>The signed-in expert whose offerings are listed.</summary>
public sealed record ListMyServicesQuery(Guid UserId);

/// <summary>Lists every service open for pricing with its platform fee and the expert's price, if any.</summary>
public sealed class ListMyServicesHandler(
    IExpertProfileRepository profiles,
    IPlatformFeeRepository fees,
    IServiceOfferingRepository offerings
) : IQueryHandler<ListMyServicesQuery, IReadOnlyList<MyServiceResponse>>
{
    public async Task<IReadOnlyList<MyServiceResponse>> HandleAsync(
        ListMyServicesQuery query,
        CancellationToken ct
    )
    {
        var profile = await profiles.FindByUserAsync(query.UserId, ct);
        var rates = await fees.ListCurrentAsync(ct);
        var mine = profile == null ? [] : await offerings.ListAsync([profile.Id], ct);
        return rates
            .Select(rate =>
            {
                var offering = mine.FirstOrDefault(o => o.ServiceCode == rate.ServiceCode);
                return new MyServiceResponse(
                    rate.ServiceCode,
                    offering?.Fee,
                    offering?.TurnaroundHours,
                    rate.Percent,
                    offering == null ? null : rate.NetOf(offering.Fee)
                );
            })
            .OrderBy(x => x.ServiceCode, StringComparer.Ordinal)
            .ToList();
    }
}
