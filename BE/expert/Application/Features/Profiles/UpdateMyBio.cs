using Caps.Common.Application;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain;

namespace Caps.Expert.Application.Features.Profiles;

/// <summary>New public profile of the signed-in expert; years of experience are not part of it.</summary>
public sealed record UpdateMyBioCommand(
    Applicant Applicant,
    string? Title,
    string? Location,
    string? Bio,
    string[] Fields,
    string? Highlights
);

/// <summary>
/// Saves the public profile from the expert's bio page. No review is needed: clients see it right away and
/// the reviewed application keeps its own snapshot.
/// </summary>
public sealed class UpdateMyBioHandler(
    IExpertProfileRepository profiles,
    IMarketplaceListing listing,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<UpdateMyBioCommand, MarketplaceExpertResponse>
{
    public async Task<MarketplaceExpertResponse> HandleAsync(
        UpdateMyBioCommand command,
        CancellationToken ct
    )
    {
        command.Applicant.EnsureVerified();
        var profile =
            await profiles.FindByUserAsync(command.Applicant.UserId, ct)
            ?? throw ExpertErrors.ExpertNotFound();
        profile.UpdatePublicProfile(
            command.Title,
            command.Location,
            command.Bio,
            command.Fields,
            command.Highlights,
            clock.GetUtcNow()
        );
        await unitOfWork.SaveChangesAsync(ct);
        return await GetMyBioHandler.ViewAsync(profile, listing, ct);
    }
}
