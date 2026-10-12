using System.Net;
using Caps.Auth.Domain.Users;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Sessions;

public sealed class AuthRefreshToken
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public string TokenHash { get; set; } = default!;
    public string? UserAgent { get; set; }
    public IPAddress? IpAddress { get; set; }
    public DateTimeOffset IssuedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public Guid? RotatedFrom { get; set; }
    public AuthRefreshToken? RotatedFromToken { get; set; }
    public ICollection<AuthRefreshToken> RotatedToTokens { get; set; } =
        new List<AuthRefreshToken>();

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
