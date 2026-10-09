namespace auth.Entities;
public sealed class AuthEmailOutbox
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ProtectedPayload { get; set; } = default!;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? SentAt { get; set; }
    public int Attempts { get; set; }
}
