using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Availability;

/// <summary>Removes one of the expert's open slots.</summary>
public sealed record RemoveSlotCommand(Applicant Applicant, Guid SlotId);

/// <summary>Only open slots can be removed; other people's slots return SLOT_NOT_FOUND.</summary>
public sealed class RemoveSlotHandler(
    IApplicantLock locks,
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IAvailabilityRepository availability,
    IServiceCatalogRepository catalog,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RemoveSlotCommand, MyAvailabilityResponse>
{
    public async Task<MyAvailabilityResponse> HandleAsync(
        RemoveSlotCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var profile =
            await profiles.FindByUserAsync(applicant.UserId, ct)
            ?? throw ExpertErrors.ExpertNotFound();
        var slot =
            await availability.FindAsync(command.SlotId, profile.Id, ct)
            ?? throw ExpertErrors.SlotNotFound();
        slot.EnsureRemovable();
        availability.Remove(slot);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        var open = await availability.ListOpenAsync(profile.Id, clock.GetUtcNow(), ct);
        var latest = await qualifications.ListLatestByProfileAsync(profile.Id, ct);
        var names = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code, x => x.Name);
        return GetMyAvailabilityHandler.Describe(open, latest, names);
    }
}
