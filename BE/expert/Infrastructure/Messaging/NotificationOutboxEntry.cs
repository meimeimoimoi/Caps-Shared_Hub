namespace Caps.Expert.Infrastructure.Messaging;

/// <summary>A message waiting to be published; the payload is cleared once it is sent.</summary>
public sealed class NotificationOutboxEntry
{
    public Guid Id { get; set; }
    public string MessageType { get; set; } = default!;
    public string Payload { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
}
