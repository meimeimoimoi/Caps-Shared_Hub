namespace Caps.Auth.Infrastructure.Persistence;

/// <summary>An email waiting to be published; the payload is encrypted and cleared once sent.</summary>
public sealed class AuthEmailOutbox
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ProtectedPayload { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public int Attempts { get; set; }
}
