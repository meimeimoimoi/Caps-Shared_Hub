namespace Caps.Expert.Domain.Reviews;

/// <summary>
/// A reviewer seen by this service, with the email from their access token. Accounts live in the identity
/// service, so this copy is what shows who holds a review and whom a System Admin can hand one to.
/// </summary>
public sealed class KnownReviewer
{
    private KnownReviewer() { }

    /// <summary>Account id from the identity service (no foreign key across services).</summary>
    public Guid UserId { get; private set; }
    public string? Email { get; private set; }
    public DateTimeOffset LastSeenAt { get; private set; }

    public static KnownReviewer Record(Guid userId, string? email, DateTimeOffset now) =>
        new()
        {
            UserId = userId,
            Email = string.IsNullOrWhiteSpace(email) ? null : email.Trim(),
            LastSeenAt = now,
        };

    /// <summary>Keeps the latest email; returns false when nothing worth saving changed.</summary>
    public bool Seen(string? email, DateTimeOffset now)
    {
        email = string.IsNullOrWhiteSpace(email) ? Email : email.Trim();
        if (email == Email && now - LastSeenAt < TimeSpan.FromDays(1))
            return false;
        Email = email;
        LastSeenAt = now;
        return true;
    }
}
