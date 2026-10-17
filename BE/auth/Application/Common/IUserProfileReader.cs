using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Common;

/// <summary>Builds the signed-in user's profile, with the same roles and permissions as the token.</summary>
public interface IUserProfileReader
{
    /// <summary>The user's profile with the roles and permissions their token carries.</summary>
    /// <param name="isNew">The user is not saved yet (sign-up), so nothing can be read back from storage.</param>
    Task<MeResponse> DescribeAsync(User user, CancellationToken ct, bool isNew = false);
}
