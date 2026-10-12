namespace auth.Entities;

/// <summary>
/// Avatar stored in the DB (separate table so reading users does not load the bytea).
/// </summary>
public sealed class UserAvatar
{
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public byte[] Data { get; set; } = default!;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
