using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Services;

/// <summary>The signed-in expert whose packages are listed.</summary>
public sealed record ListMyServiceQuery(Guid UserId);

/// <summary>Lists the expert's packages with the current platform fee and the net amount of each.</summary>
public sealed class ListMyServiceHandler(
    IExpertProfileRepository profiles,
    IPlatformFeeRepository fees,
    IServiceOfferingRepository offerings,
    TimeProvider clock
) : IQueryHandler<ListMyServiceQuery, IReadOnlyList<MyServiceResponse>>
{
    public async Task<IReadOnlyList<MyServiceResponse>> HandleAsync(
        ListMyServiceQuery query,
        CancellationToken ct
    )
    {
        var profile = await profiles.GetApprovedAsync(query.UserId, ct);
        var rates = (await fees.ListCurrentAsync(clock.GetUtcNow(), ct)).ToDictionary(r =>
            r.ServiceType
        );
        var mine = await offerings.ListActiveAsync(profile.Id, ct);
        // Every offering was created against a rate and rates are never deleted, so the lookup always hits
        return mine.Where(o => rates.ContainsKey(o.ServiceType))
            .Select(o =>
            {
                var rate = rates[o.ServiceType];
                return new MyServiceResponse(
                    o.Id,
                    o.ServiceType,
                    o.Fee,
                    o.TurnaroundHours,
                    rate.Percent,
                    rate.NetOf(o.Fee)
                );
            })
            .ToList();
    }
}
