using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Profiles;

/// <summary>New professional name and contact phone of the signed-in expert.</summary>
public sealed record UpdateMyProfileCommand(
    Applicant Applicant,
    string? DisplayName,
    string? Phone
);

/// <summary>
/// Updates the name and phone from the expert settings page, at any stage after the first draft. No review is
/// needed: they are contact details, not competency evidence.
/// </summary>
public sealed class UpdateMyProfileHandler(
    IExpertProfileRepository profiles,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<UpdateMyProfileCommand, ExpertContactResponse>
{
    public async Task<ExpertContactResponse> HandleAsync(
        UpdateMyProfileCommand command,
        CancellationToken ct
    )
    {
        command.Applicant.EnsureVerified();
        var profile =
            await profiles.FindByUserAsync(command.Applicant.UserId, ct)
            ?? throw ExpertErrors.ExpertNotFound();
        profile.UpdateContact(command.DisplayName, command.Phone, clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        return new(profile.DisplayName ?? command.Applicant.DefaultName, profile.Phone);
    }
}
