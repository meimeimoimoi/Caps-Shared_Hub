namespace Caps.Workflow.Infrastructure.Messaging;

/// <summary>An event waiting to be published; the payload is cleared once it is sent.</summary>
public sealed class EventOutboxEntry
{
    public Guid Id { get; set; }

    /// <summary>Full name of the contract type in Caps.Contracts.</summary>
    public string MessageType { get; set; } = default!;
    public string Payload { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
}
