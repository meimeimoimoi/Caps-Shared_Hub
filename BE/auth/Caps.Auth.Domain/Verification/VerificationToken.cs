using Caps.Auth.Domain.Users;
using Caps.Common.Domain;

namespace Caps.Auth.Domain.Verification;

public sealed class VerificationToken
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;

    public string Purpose { get; set; } = default!;
    public string TokenHash { get; set; } = default!;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
    public DateTimeOffset? InvalidatedAt { get; set; }
    public int AttemptCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

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
