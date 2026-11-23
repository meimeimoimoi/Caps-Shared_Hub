using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Services;

/// <summary>The signed-in expert and the service whose price history is listed.</summary>
public sealed record ListMyServiceHistoryQuery(Guid UserId, string ServiceCode);

/// <summary>Lists every price the expert saved for the service, most recent first; empty before the first one.</summary>
public sealed class ListMyServiceHistoryHandler(
    IExpertProfileRepository profiles,
    IServiceOfferingRepository offerings
) : IQueryHandler<ListMyServiceHistoryQuery, IReadOnlyList<ServiceOfferingChangeResponse>>
{
    public async Task<IReadOnlyList<ServiceOfferingChangeResponse>> HandleAsync(
        ListMyServiceHistoryQuery query,
        CancellationToken ct
    )
    {
        var profile = await profiles.FindByUserAsync(query.UserId, ct);
        if (profile == null)
            return [];
        var code = query.ServiceCode.Trim().ToUpperInvariant();
        var changes = await offerings.ListChangesAsync(profile.Id, code, ct);
        return changes
            .Select(x => new ServiceOfferingChangeResponse(
                x.OldFee,
                x.NewFee,
                x.OldTurnaroundHours,
                x.NewTurnaroundHours,
                x.ChangedAt
            ))
            .ToList();
    }
}
