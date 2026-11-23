using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Availability;

/// <summary>Sets how many cases the expert runs at once (shared by all their services).</summary>
public sealed record SetCapacityCommand(Applicant Applicant, int Capacity);

/// <summary>Changes the capacity under the expert's lock; running cases are never touched.</summary>
public sealed class SetCapacityHandler(
    IApplicantLock locks,
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IServiceCatalogRepository catalog,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SetCapacityCommand, MyAvailabilityResponse>
{
    public async Task<MyAvailabilityResponse> HandleAsync(
        SetCapacityCommand command,
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
        profile.SetCapacity(command.Capacity, clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        var latest = await qualifications.ListLatestByProfileAsync(profile.Id, ct);
        var names = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code, x => x.Name);
        return GetMyAvailabilityHandler.Describe(profile, latest, names);
    }
}
