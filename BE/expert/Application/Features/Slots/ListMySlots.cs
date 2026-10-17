using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;

namespace Caps.Expert.Application.Features.Slots;

/// <summary>The signed-in expert whose upcoming slots are listed.</summary>
public sealed record ListMySlotQuery(Guid UserId);

/// <summary>Lists the expert's slots that have not ended yet, earliest first.</summary>
public sealed class ListMySlotHandler(
    IExpertProfileRepository profiles,
    ISlotRepository slots,
    TimeProvider clock
) : IQueryHandler<ListMySlotQuery, IReadOnlyList<SlotResponse>>
{
    public async Task<IReadOnlyList<SlotResponse>> HandleAsync(
        ListMySlotQuery query,
        CancellationToken ct
    )
    {
        var profile = await profiles.GetApprovedAsync(query.UserId, ct);
        return await slots.ListUpcomingAsync(profile.Id, clock.GetUtcNow(), ct);
    }
}
