using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Application.Features.Slots;

/// <summary>The time range an expert opens for booking.</summary>
public sealed record OpenSlotCommand(Guid UserId, DateTimeOffset StartAt, DateTimeOffset EndAt);

/// <summary>Opens a slot that does not overlap the expert's other slots.</summary>
public sealed class OpenSlotHandler(
    IExpertProfileRepository profiles,
    ISlotRepository slots,
    IApplicantLock locks,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<OpenSlotCommand, SlotResponse>
{
    public async Task<SlotResponse> HandleAsync(OpenSlotCommand command, CancellationToken ct)
    {
        var profile = await profiles.GetApprovedAsync(command.UserId, ct);
        var slot = AvailabilitySlot.Open(
            profile.Id,
            command.StartAt,
            command.EndAt,
            clock.GetUtcNow()
        );

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        // Serializes this expert's slot changes, so two parallel requests cannot both pass the overlap check
        await locks.AcquireAsync(command.UserId, ct);
        if (await slots.OverlapsAsync(profile.Id, slot.StartAt, slot.EndAt, ct))
        {
            throw ExpertErrors.SlotOverlaps();
        }

        slots.Add(slot);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new(slot.Id, slot.StartAt, slot.EndAt, slot.Status);
    }
}
