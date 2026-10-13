using System.Globalization;
using Caps.Auth.Application.Abstractions.Persistence;
using Caps.Auth.Domain.Users;
using Caps.Common.Application;

namespace Caps.Auth.Application.Common;

/// <summary>Claims a signed access token carries about the account at the time it was issued.</summary>
public sealed record SessionClaims(Guid UserId, string? TokenVersion, string? AccountStatus);

/// <summary>Checks a signed-in session against the account in auth's own database.</summary>
public interface ISessionGuard
{
    /// <summary>
    /// Rejects tokens issued before the account was revoked (password change, reset, replay).
    /// With <paramref name="requireCurrentStatus"/>, also asks for a refresh when the status changed.
    /// </summary>
    Task EnsureValidAsync(SessionClaims claims, bool requireCurrentStatus, CancellationToken ct);
}

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
