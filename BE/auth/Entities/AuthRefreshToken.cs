using System.Net;
using Caps.Common.Database;

namespace auth.Entities;

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
    public ICollection<AuthRefreshToken> RotatedToTokens { get; set; } = new List<AuthRefreshToken>();
}
