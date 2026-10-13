using Caps.Auth.Domain.Business;
using Caps.Auth.Domain.Sessions;
using Caps.Auth.Domain.Verification;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Users;

/// <summary>
/// Account aggregate. State changes only through its methods, so the account rules
/// (lockout, verification, session revocation) cannot be bypassed.
/// </summary>
public sealed class User
{
    private User() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public string Email { get; private set; } = default!;
    public string PasswordHash { get; private set; } = default!;
    public string FullName { get; private set; } = default!;
    public string? Phone { get; private set; }
    public int FailedLoginAttempts { get; private set; }
    public DateTimeOffset? LockoutEnd { get; private set; }
    public int TokenVersion { get; private set; }
    public string Status { get; private set; } = UserStatus.PendingVerification;
    public DateTimeOffset? EmailVerifiedAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public ICollection<UserRole> UserRoles { get; } = [];
    public ICollection<AuthRefreshToken> RefreshTokens { get; } = [];
    public ICollection<VerificationToken> VerificationTokens { get; } = [];
    public BusinessProfile? BusinessProfile { get; }

    public bool IsActive => Status == UserStatus.Active;
    public bool IsPendingVerification => Status == UserStatus.PendingVerification;

    /// <summary>Active or still waiting for email verification.</summary>
    public bool CanSignIn => IsActive || IsPendingVerification;

    /// <summary>Emails are compared case-insensitively and without surrounding spaces.</summary>
    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    /// <summary>New account waiting for email verification; the display name falls back to the email's local part.</summary>
    public static User Register(
        string email,
        string? displayName,
        string passwordHash,
        DateTimeOffset now
    )
    {
        var normalized = NormalizeEmail(email);
        return new()
        {
            Email = normalized,
            FullName = string.IsNullOrWhiteSpace(displayName)
                ? normalized.Split('@')[0]
                : displayName.Trim(),
            PasswordHash = passwordHash,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

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

    /// <summary>Clears failed attempts and any lockout after a correct password.</summary>
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

    /// <summary>Profile page: the display name is required.</summary>
    public void UpdateProfile(string displayName, string? phone, DateTimeOffset now)
    {
        FullName = displayName.Trim();
        Phone = phone?.Trim();
        UpdatedAt = now;
    }
}
