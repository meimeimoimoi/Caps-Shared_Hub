using System.Net;
using Caps.Auth.Domain.Users;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Sessions;

/// <summary>One refresh session. Rotating creates a successor, which lets reuse of an old token be detected.</summary>
public sealed class AuthRefreshToken
{
    private AuthRefreshToken() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid UserId { get; private set; }
    public User User { get; } = default!;

    public string TokenHash { get; private set; } = default!;
    public string? UserAgent { get; }
    public IPAddress? IpAddress { get; }
    public DateTimeOffset IssuedAt { get; private set; }
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? RevokedAt { get; private set; }
    public Guid? RotatedFrom { get; private set; }
    public AuthRefreshToken? RotatedFromToken { get; }
    public ICollection<AuthRefreshToken> RotatedToTokens { get; } = [];

    public static AuthRefreshToken Issue(
        Guid userId,
        string tokenHash,
        DateTimeOffset now,
        DateTimeOffset expiresAt,
        Guid? rotatedFrom
    ) =>
        new()
        {
            UserId = userId,
            TokenHash = tokenHash,
            IssuedAt = now,
            ExpiresAt = expiresAt,
            RotatedFrom = rotatedFrom,
        };

    public bool IsRevoked => RevokedAt != null;

    public bool IsExpired(DateTimeOffset now) => ExpiresAt <= now;

    /// <summary>Keeps the first revocation time if called again.</summary>
    public void Revoke(DateTimeOffset now) => RevokedAt ??= now;
}
