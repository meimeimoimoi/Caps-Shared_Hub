namespace Caps.Auth.Infrastructure.Persistence;

/// <summary>An account event waiting to be published; the payload is cleared once sent.</summary>
public sealed class AccountEventOutbox
{
    public Guid Id { get; set; }

    /// <summary>Contract name of the payload (AccountStatusChangedEvent or AuditRecordedEvent).</summary>
    public string MessageType { get; set; } = default!;

    public string Payload { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
}
