using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Profiles;

namespace Caps.Expert.Application.Features.Availability;

/// <summary>The expert's switch for new cases and the number of cases handled at once.</summary>
public sealed record SetAvailabilityCommand(Guid UserId, bool Accepting, int Capacity);

/// <summary>Turns taking new cases on or off and sets the expert's capacity.</summary>
public sealed class SetAvailabilityHandler(
    IExpertProfileRepository profiles,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SetAvailabilityCommand, AvailabilityResponse>
{
    public async Task<AvailabilityResponse> HandleAsync(
        SetAvailabilityCommand command,
        CancellationToken ct
    )
    {
        var profile = await profiles.GetApprovedAsync(command.UserId, ct);
        var offerings = await profiles.CountActiveOfferingsAsync(profile.Id, ct);
        profile.SetAvailability(command.Accepting, command.Capacity, offerings, clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        return new(
            profile.ServiceStatus == ExpertServiceStatus.Active,
            profile.Capacity,
            profile.ActiveCases
        );
    }
}
