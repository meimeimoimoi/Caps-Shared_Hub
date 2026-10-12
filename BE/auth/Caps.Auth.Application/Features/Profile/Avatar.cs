using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.Common;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Users;
using Caps.Common.Application;

namespace Caps.Auth.Application.Features.Profile;

/// <param name="ContentType">Detected from the file bytes by the caller, never taken from the client.</param>
public sealed record UpdateAvatarCommand(Guid UserId, string ContentType, byte[] Data);

public sealed record RemoveAvatarCommand(Guid UserId);

public sealed record GetAvatarQuery(Guid UserId);

public sealed class UpdateAvatarHandler(
    IUserRepository users,
    IUserAvatarRepository avatars,
    IUserProfileReader profiles,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<UpdateAvatarCommand, MeResponse>
{
    public async Task<MeResponse> HandleAsync(UpdateAvatarCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var user = await users.GetLockedAsync(command.UserId, ct);
        AccountGuards.EnsureActive(user);
        var avatar = await avatars.GetAsync(user.Id, ct);
        if (avatar == null)
        {
            avatar = new UserAvatar { UserId = user.Id };
            avatars.Add(avatar);
        }
        avatar.Replace(command.ContentType, command.Data, clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await profiles.DescribeAsync(user, ct);
    }
}

public sealed class RemoveAvatarHandler(
    IUserRepository users,
    IUserAvatarRepository avatars,
    IUserProfileReader profiles
) : ICommandHandler<RemoveAvatarCommand, MeResponse>
{
    public async Task<MeResponse> HandleAsync(RemoveAvatarCommand command, CancellationToken ct)
    {
        var user = await users.GetAsync(command.UserId, ct);
        AccountGuards.EnsureActive(user);
        await avatars.DeleteAsync(user.Id, ct);
        return await profiles.DescribeAsync(user, ct);
    }
}

public sealed class GetAvatarHandler(IUserAvatarRepository avatars)
    : IQueryHandler<GetAvatarQuery, AvatarFile?>
{
    public Task<AvatarFile?> HandleAsync(GetAvatarQuery query, CancellationToken ct) =>
        avatars.GetFileAsync(query.UserId, ct);
}
