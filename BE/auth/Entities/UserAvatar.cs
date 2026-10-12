namespace auth.Entities;

/// <summary>
/// Ảnh đại diện lưu trong DB (bảng riêng để không kéo bytea theo mỗi lần đọc users).
/// </summary>
public sealed class UserAvatar
{
    public Guid UserId { get; set; }
    public User User { get; set; } = default!;
    public string ContentType { get; set; } = default!;
    public byte[] Data { get; set; } = default!;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
