using System.Globalization;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain.Users;
using Caps.Common.Application;

namespace Caps.Auth.Application.Common;

/// <summary>Compares the token's version and status with the account's current state.</summary>
public sealed class SessionGuard(IUserRepository users) : ISessionGuard
{
    public async Task EnsureValidAsync(
        SessionClaims claims,
        bool requireCurrentStatus,
        CancellationToken ct
    )
    {
        var state = await users.GetSessionStateAsync(claims.UserId, ct);
        if (
            state == null
            || (state.Status != UserStatus.Active && state.Status != UserStatus.PendingVerification)
            || claims.TokenVersion != state.TokenVersion.ToString(CultureInfo.InvariantCulture)
        )
        {
            throw CommonErrors.InvalidSession("Session revoked.");
        }
        // When the current role/status changes, a new token is required; never trust stale claims.
        if (requireCurrentStatus && claims.AccountStatus != state.Status)
            throw CommonErrors.RefreshRequired("Refresh the session after account status changes.");
    }
}
