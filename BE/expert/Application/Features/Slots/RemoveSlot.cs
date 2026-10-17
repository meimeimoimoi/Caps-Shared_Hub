using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Slots;

/// <summary>The slot the expert wants to remove.</summary>
public sealed record RemoveSlotCommand(Guid UserId, Guid SlotId);

/// <summary>Removes an open slot; booked slots stay because a case depends on them.</summary>
public sealed class RemoveSlotHandler(
    IExpertProfileRepository profiles,
    ISlotRepository slots,
    IUnitOfWork unitOfWork
) : ICommandHandler<RemoveSlotCommand, bool>
{
    public async Task<bool> HandleAsync(RemoveSlotCommand command, CancellationToken ct)
    {
        var profile = await profiles.GetApprovedAsync(command.UserId, ct);
        var slot =
            await slots.FindAsync(profile.Id, command.SlotId, ct)
            ?? throw ExpertErrors.SlotNotFound();
        if (!slot.IsOpen)
        {
            throw ExpertErrors.SlotNotOpen();
        }
        slots.Remove(slot);
        await unitOfWork.SaveChangesAsync(ct);
        return true;
    }
}
