using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Profile;

/// <summary>New display name and phone of the signed-in user.</summary>
public sealed record UpdateProfileCommand(Guid UserId, string DisplayName, string? Phone);

/// <summary>Updates the display name and phone of an active account.</summary>
public sealed class UpdateProfileHandler(
    IUserRepository users,
    IUserProfileReader profiles,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<UpdateProfileCommand, MeResponse>
{
    public async Task<MeResponse> HandleAsync(UpdateProfileCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(command.UserId, ct);
        AccountGuards.EnsureActive(user);
        user.UpdateProfile(command.DisplayName, command.Phone, clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await profiles.DescribeAsync(user, ct);
    }
}
