namespace Caps.Auth.Infrastructure.Persistence;

/// <summary>An account event waiting to be published; the payload is cleared once sent.</summary>
public sealed class AccountEventOutbox
{
    public Guid Id { get; set; }
    public string Payload { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
}
