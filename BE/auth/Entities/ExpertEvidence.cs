using Caps.Common.Database;

namespace auth.Entities;

public sealed class ExpertEvidence
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; set; }
    public ExpertProfile ExpertProfile { get; set; } = default!;

    /// <summary>Lần nộp chứa file này; null với dữ liệu tạo trước khi có bảng expert_application.</summary>
    public Guid? ApplicationId { get; set; }
    public ExpertApplication? Application { get; set; }

    /// <summary>Mã nhóm tài liệu: CV hoặc EV-01…EV-05 (POL-EXP-01).</summary>
    public string EvidenceType { get; set; } = default!;

    /// <summary>Khóa object trong storage riêng tư, không phải URL công khai.</summary>
    public string FileUrl { get; set; } = default!;
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public long? SizeBytes { get; set; }
    public string? ParsedMeta { get; set; } // jsonb
    public string? ScreeningFlag { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
