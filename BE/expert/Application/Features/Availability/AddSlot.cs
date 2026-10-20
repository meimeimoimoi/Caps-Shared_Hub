using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;
using Caps.Expert.Domain.Catalog;

namespace Caps.Expert.Application.Features.Availability;

/// <summary>Opens a slot in which the expert can take new work.</summary>
public sealed record AddSlotCommand(
    Applicant Applicant,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt
);

/// <summary>Checks the slot against the expert's other open slots under the expert's lock.</summary>
public sealed class AddSlotHandler(
    IApplicantLock locks,
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IAvailabilityRepository availability,
    IServiceCatalogRepository catalog,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<AddSlotCommand, MyAvailabilityResponse>
{
    public async Task<MyAvailabilityResponse> HandleAsync(
        AddSlotCommand command,
        CancellationToken ct
    )
    {
        var applicant = command.Applicant;
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        await locks.AcquireAsync(applicant.UserId, ct);
        var profile =
            await profiles.FindByUserAsync(applicant.UserId, ct)
            ?? throw ExpertErrors.ExpertNotFound();
        profile.RecordAccountStatus(applicant.AccountStatus);
        var now = clock.GetUtcNow();
        var open = await availability.ListOpenAsync(profile.Id, now, ct);
        var slot = AvailabilitySlot.Add(profile.Id, command.StartAt, command.EndAt, open, now);
        availability.Add(slot);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        var latest = await qualifications.ListLatestByProfileAsync(profile.Id, ct);
        var names = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code, x => x.Name);
        return GetMyAvailabilityHandler.Describe([.. open, slot], latest, names);
    }
}
