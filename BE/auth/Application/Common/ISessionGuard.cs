namespace Caps.Auth.Application.Common;

/// <summary>Checks a signed-in session against the account in auth's own database.</summary>
public interface ISessionGuard
{
    /// <summary>
    /// Rejects tokens issued before the account was revoked (password change, reset, replay).
    /// With <paramref name="requireCurrentStatus"/>, also asks for a refresh when the status changed.
    /// </summary>
    Task EnsureValidAsync(SessionClaims claims, bool requireCurrentStatus, CancellationToken ct);
}
