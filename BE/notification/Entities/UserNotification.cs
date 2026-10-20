namespace Caps.Notification.Entities;

/// <summary>
/// One in-app notification for an account. The FE renders the text from <see cref="Type"/> and
/// <see cref="Data"/>, so wording and language stay in the client.
/// </summary>
public sealed class UserNotification
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }

    /// <summary>Id of the event that produced it; a redelivered event finds the row and stops.</summary>
    public Guid SourceEventId { get; private set; }

    public string Type { get; private set; } = default!;

    /// <summary>Small JSON object with what the client needs to render and link the notification.</summary>
    public string Data { get; private set; } = "{}";

    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? ReadAt { get; private set; }

    /// <summary>When the matching email went out; null means it still has to be sent.</summary>
    public DateTimeOffset? EmailSentAt { get; private set; }

    private UserNotification() { }

    public static UserNotification Create(
        Guid userId,
        Guid sourceEventId,
        string type,
        string data,
        DateTimeOffset now
    ) =>
        new()
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SourceEventId = sourceEventId,
            Type = type,
            Data = data,
            CreatedAt = now,
        };

    public void MarkRead(DateTimeOffset now) => ReadAt ??= now;

    public void MarkEmailSent(DateTimeOffset now) => EmailSentAt ??= now;
}
