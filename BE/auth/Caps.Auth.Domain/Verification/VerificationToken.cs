using Caps.Auth.Domain.Users;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Verification;

/// <summary>A single-use emailed token (link or 6-digit code), stored as a hash with an expiry.</summary>
public sealed class VerificationToken
{
    private VerificationToken() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid UserId { get; private set; }
    public User User { get; } = default!;

    public string Purpose { get; private set; } = default!;
    public string TokenHash { get; private set; } = default!;
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset? UsedAt { get; private set; }
    public DateTimeOffset? InvalidatedAt { get; private set; }
    public int AttemptCount { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }

    public static VerificationToken Create(
        Guid userId,
        string purpose,
        string tokenHash,
        DateTimeOffset now,
        DateTimeOffset expiresAt
    ) =>
        new()
        {
            UserId = userId,
            Purpose = purpose,
            TokenHash = tokenHash,
            CreatedAt = now,
            ExpiresAt = expiresAt,
        };

    public bool IsExpired(DateTimeOffset now) => ExpiresAt <= now;

    /// <summary>Not used, not replaced by a newer email and not expired.</summary>
    public bool IsUsable(DateTimeOffset now) =>
        UsedAt == null && InvalidatedAt == null && !IsExpired(now);

    public bool AttemptsExhausted(int maxAttempts) => AttemptCount >= maxAttempts;

    public void RecordFailedAttempt() => AttemptCount++;

    public void MarkUsed(DateTimeOffset now) => UsedAt = now;
}
