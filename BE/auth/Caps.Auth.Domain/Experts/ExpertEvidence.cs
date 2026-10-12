using Caps.Common.Domain;

namespace Caps.Auth.Domain.Experts;

public sealed class ExpertEvidence
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ExpertProfileId { get; set; }
    public ExpertProfile ExpertProfile { get; set; } = default!;

    /// <summary>Application that owns this file; null for rows created before the expert_application table existed.</summary>
    public Guid? ApplicationId { get; set; }
    public ExpertApplication? Application { get; set; }

    /// <summary>Document group code: CV or EV-01…EV-05 (POL-EXP-01).</summary>
    public string EvidenceType { get; set; } = default!;

    /// <summary>Object key in private storage, not a public URL.</summary>
    public string FileUrl { get; set; } = default!;
    public string? FileName { get; set; }
    public string? ContentType { get; set; }
    public long? SizeBytes { get; set; }
    public string? ParsedMeta { get; set; } // jsonb
    public string? ScreeningFlag { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
