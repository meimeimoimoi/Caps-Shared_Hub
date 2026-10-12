using Caps.Common.Domain;

namespace auth.Entities;

/// <summary>Audit trail của hồ sơ: mỗi lần đổi trạng thái lưu actor, thời điểm và ghi chú.</summary>
public sealed class ExpertApplicationEvent
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ApplicationId { get; set; }
    public ExpertApplication Application { get; set; } = default!;
    public Guid ActorUserId { get; set; }
    public User Actor { get; set; } = default!;
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = default!;
    public string? Note { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
