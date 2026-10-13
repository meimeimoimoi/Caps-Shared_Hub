using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Common;

/// <summary>Reads roles, permissions and the avatar version for the profile response.</summary>
public sealed class UserProfileReader(IUserAccessReader access, IUserAvatarRepository avatars)
    : IUserProfileReader
{
    public async Task<MeResponse> DescribeAsync(User user, CancellationToken ct, bool isNew = false)
    {
        var roles = isNew ? [RoleCodes.User] : await access.GetRoleCodesAsync(user.Id, ct);
        // Matches the JWT: only ACTIVE accounts get business permissions.
        var permissions =
            user.Status == UserStatus.Active
                ? await access.GetPermissionCodesAsync(user.Id, ct)
                : [];
        var avatarAt = isNew ? null : await avatars.GetUpdatedAtAsync(user.Id, ct);
        return new(
            user.Id.ToString(),
            user.Email,
            user.FullName,
            user.Phone,
            user.Status,
            user.EmailVerifiedAt != null,
            roles,
            permissions,
            avatarAt == null ? null : AvatarUrl(user.Id, avatarAt.Value)
        );
    }

    // Relative path through the gateway; ?v= changes on every update so browsers skip the old cache.
    private static string AvatarUrl(Guid id, DateTimeOffset at) =>
        $"/api/v1/users/{id}/avatar?v={at.ToUnixTimeMilliseconds()}";
}
