using Caps.Auth.Domain.Business;
using Caps.Auth.Domain.Experts;
using Caps.Auth.Domain.Sessions;
using Caps.Auth.Domain.Verification;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Users;

public sealed class User
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string Email { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string FullName { get; set; } = default!;

    /// <summary>
    /// Helper accessor mapping to FullName for backwards compatibility with existing auth endpoints.
    /// </summary>
    public string DisplayName
    {
        get => FullName;
        set => FullName = value;
    }

    public string? Phone { get; set; }
    public int FailedLoginAttempts { get; set; }
    public DateTimeOffset? LockoutEnd { get; set; }
    public int TokenVersion { get; set; }
    public string Status { get; set; } = "PENDING_VERIFICATION";
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<AuthRefreshToken> RefreshTokens { get; set; } = new List<AuthRefreshToken>();
    public ICollection<VerificationToken> VerificationTokens { get; set; } =
        new List<VerificationToken>();
    public BusinessProfile? BusinessProfile { get; set; }
    public ExpertProfile? ExpertProfile { get; set; }
}
