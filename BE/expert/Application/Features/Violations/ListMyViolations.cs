using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Features.Violations;

/// <summary>The signed-in expert's own violations.</summary>
public sealed record ListMyViolationsQuery(Guid UserId);

/// <summary>Same view as the admin's; empty before the expert has a profile.</summary>
public sealed class ListMyViolationsHandler(
    IExpertProfileRepository profiles,
    IQueryHandler<ListViolationsQuery, ExpertViolationsResponse> list
) : IQueryHandler<ListMyViolationsQuery, ExpertViolationsResponse>
{
    public async Task<ExpertViolationsResponse> HandleAsync(
        ListMyViolationsQuery query,
        CancellationToken ct
    )
    {
        var profile = await profiles.FindByUserAsync(query.UserId, ct);
        return profile == null
            ? new(0, ViolationRules.MaxExcuses, ViolationRules.WindowDays, [])
            : await list.HandleAsync(new(profile.Id), ct);
    }
}
