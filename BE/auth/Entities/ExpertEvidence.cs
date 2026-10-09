using Caps.Common.Database;

namespace auth.Entities;

public sealed class ExpertEvidence
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; set; }
    public ExpertProfile ExpertProfile { get; set; } = default!;

    public string EvidenceType { get; set; } = default!;
    public string FileUrl { get; set; } = default!;
    public string? ParsedMeta { get; set; } // jsonb
    public string? ScreeningFlag { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
