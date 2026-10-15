using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Common;

/// <summary>Starts sessions (access token + refresh token) and revokes all of an account's sessions.</summary>
public interface ISessionIssuer
{
    /// <summary>Issues an access token plus a new refresh token (added to the unit of work, not saved).</summary>
    Task<SessionResult> IssueAsync(
        User user,
        CancellationToken ct,
        Guid? rotatedFrom = null,
        bool isNew = false
    );

    /// <summary>Signs out every device: bumps the token version and revokes all refresh tokens.</summary>
    Task RevokeAllAsync(User user, CancellationToken ct);
}
