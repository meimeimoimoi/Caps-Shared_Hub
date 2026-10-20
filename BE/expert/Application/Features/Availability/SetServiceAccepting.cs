using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Availability;

/// <summary>Turns new requests on or off for one of the expert's services.</summary>
public sealed record SetServiceAcceptingCommand(
    Applicant Applicant,
    string ServiceCode,
    bool Accepting
);

/// <summary>Applies to the service's latest qualification; turning on needs an approved service.</summary>
public sealed class SetServiceAcceptingHandler(
    IApplicantLock locks,
    IExpertProfileRepository profiles,
    IQualificationRepository qualifications,
    IAvailabilityRepository availability,
    IServiceCatalogRepository catalog,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SetServiceAcceptingCommand, MyAvailabilityResponse>
{
    public async Task<MyAvailabilityResponse> HandleAsync(
        SetServiceAcceptingCommand command,
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
        var qualification =
            await qualifications.FindLatestAsync(
                profile.Id,
                command.ServiceCode.Trim().ToUpperInvariant(),
                ct
            ) ?? throw ExpertErrors.QualificationNotFound();
        var now = clock.GetUtcNow();
        qualification.SetAcceptingRequests(command.Accepting, now);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        var open = await availability.ListOpenAsync(profile.Id, now, ct);
        var latest = await qualifications.ListLatestByProfileAsync(profile.Id, ct);
        var names = (await catalog.ListActiveAsync(ct)).ToDictionary(x => x.Code, x => x.Name);
        return GetMyAvailabilityHandler.Describe(open, latest, names);
    }
}
