using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Services;

/// <summary>The signed-in expert whose offerings are listed.</summary>
public sealed record ListMyServicesQuery(Guid UserId);

/// <summary>
/// Lists every service open for pricing with its platform fee, any announced fee change, the price and
/// turnaround limits, and the expert's price if any.
/// </summary>
public sealed class ListMyServicesHandler(
    IExpertProfileRepository profiles,
    IPlatformFeeRepository fees,
    IServiceOfferingRepository offerings,
    IExpertPolicyProvider policies,
    TimeProvider clock
) : IQueryHandler<ListMyServicesQuery, IReadOnlyList<MyServiceResponse>>
{
    public async Task<IReadOnlyList<MyServiceResponse>> HandleAsync(
        ListMyServicesQuery query,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var profile = await profiles.FindByUserAsync(query.UserId, ct);
        var rates = await fees.ListCurrentAsync(now, ct);
        var pending = await fees.ListAllPendingAsync(now, ct);
        var mine = profile == null ? [] : await offerings.ListAsync([profile.Id], ct);
        var limits = PlatformFeeRows.Limits(await policies.GetPricingAsync(ct));
        return rates
            .Select(rate =>
            {
                var offering = mine.FirstOrDefault(o => o.ServiceCode == rate.ServiceCode);
                var next = pending
                    .Where(p => p.ServiceCode == rate.ServiceCode)
                    .MaxBy(p => p.EffectiveFrom);
                return new MyServiceResponse(
                    rate.ServiceCode,
                    offering?.Fee,
                    offering?.TurnaroundHours,
                    rate.Percent,
                    offering == null ? null : rate.NetOf(offering.Fee),
                    next == null
                        ? null
                        : new(next.Percent, PlatformFeeRows.LateOf(next), next.EffectiveFrom),
                    limits
                );
            })
            .OrderBy(x => x.ServiceCode, StringComparer.Ordinal)
            .ToList();
    }
}
