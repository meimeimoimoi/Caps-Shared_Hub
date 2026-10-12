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
    public string Status { get; set; } = UserStatus.PendingVerification;
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public ICollection<AuthRefreshToken> RefreshTokens { get; set; } = new List<AuthRefreshToken>();
    public ICollection<VerificationToken> VerificationTokens { get; set; } =
        new List<VerificationToken>();
    public BusinessProfile? BusinessProfile { get; set; }
    public ExpertProfile? ExpertProfile { get; set; }

    public bool IsActive => Status == UserStatus.Active;
    public bool IsPendingVerification => Status == UserStatus.PendingVerification;

    /// <summary>Active or still waiting for email verification.</summary>
    public bool CanSignIn => IsActive || IsPendingVerification;

    /// <summary>New account waiting for email verification; the display name falls back to the email's local part.</summary>
    public static User Register(string normalizedEmail, string? displayName, string passwordHash) =>
        new()
        {
            Email = normalizedEmail,
            FullName = string.IsNullOrWhiteSpace(displayName)
                ? normalizedEmail.Split('@')[0]
                : displayName.Trim(),
            PasswordHash = passwordHash,
        };

    /// <summary>Throws the generic credential error so a blocked account looks like a wrong password.</summary>
    public void EnsureCanSignIn()
    {
        if (!CanSignIn)
            throw AuthErrors.InvalidCredentials();
    }

    public bool IsLockedOut(DateTimeOffset now) => LockoutEnd > now;

    /// <summary>Counts a wrong password; reaching the limit locks the account and restarts the count.</summary>
    public void RecordFailedLogin(int maxAttempts, TimeSpan lockout, DateTimeOffset now)
    {
        FailedLoginAttempts++;
        if (FailedLoginAttempts < maxAttempts)
            return;
        LockoutEnd = now.Add(lockout);
        FailedLoginAttempts = 0;
    }

    /// <param name="rehashedPassword">Set when the stored hash uses outdated parameters.</param>
    public void RecordSuccessfulLogin(string? rehashedPassword)
    {
        if (rehashedPassword != null)
            PasswordHash = rehashedPassword;
        FailedLoginAttempts = 0;
        LockoutEnd = null;
    }

    public void VerifyEmail(DateTimeOffset now)
    {
        if (!IsPendingVerification)
            throw AuthErrors.AlreadyVerified();
        EmailVerifiedAt = now;
        Status = UserStatus.Active;
        UpdatedAt = now;
    }

    public void ChangePassword(string passwordHash, DateTimeOffset now)
    {
        PasswordHash = passwordHash;
        UpdatedAt = now;
    }

    /// <summary>Reset through the emailed link also clears a lockout caused by wrong passwords.</summary>
    public void ResetPassword(string passwordHash, DateTimeOffset now)
    {
        ChangePassword(passwordHash, now);
        FailedLoginAttempts = 0;
        LockoutEnd = null;
    }

    /// <summary>Invalidates every access token already issued (they carry the old version).</summary>
    public void RevokeAllSessions() => TokenVersion++;

    public void UpdateProfile(string displayName, string? phone, DateTimeOffset now)
    {
        FullName = displayName.Trim();
        Phone = phone?.Trim();
        UpdatedAt = now;
    }
}
