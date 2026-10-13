namespace Caps.Common.Application;

public interface ICurrentUser
{
    string? UserId { get; }
    string? Email { get; }

    /// <summary>Account status claim of the token (ACTIVE once the email is verified).</summary>
    string? AccountStatus { get; }

    /// <summary>The access token's id (jti), used to revoke this one token on sign-out.</summary>
    string? TokenId { get; }

    /// <summary>When the access token expires (exp).</summary>
    DateTimeOffset? TokenExpiresAt { get; }
    bool IsAuthenticated { get; }
}

public static class CurrentUserExtensions
{
    /// <summary>The signed-in user's id; a missing or malformed subject claim is an invalid session.</summary>
    public static Guid RequireUserId(this ICurrentUser user) =>
        Guid.TryParse(user.UserId, out var id)
            ? id
            : throw CommonErrors.InvalidSession("Invalid session.");
}

/// <summary>
/// Shared record of revoked sessions, so every service rejects a revoked access token without calling auth.
/// Writes never throw: the auth database stays the source of truth and entries only live as long as a token.
/// </summary>
public interface ISessionRevocationStore
{
    /// <summary>Revokes every token of the user issued before <paramref name="tokenVersion"/> (password change, reset, stolen refresh token).</summary>
    Task RevokeAllAsync(Guid userId, int tokenVersion, CancellationToken ct);

    /// <summary>Revokes one access token (sign-out on this device) until it expires anyway.</summary>
    Task RevokeTokenAsync(string tokenId, DateTimeOffset expiresAt, CancellationToken ct);

    /// <summary>True when revoked, false when not, null when the store cannot be reached.</summary>
    Task<bool?> IsRevokedAsync(
        Guid userId,
        int tokenVersion,
        string? tokenId,
        CancellationToken ct
    );
}
