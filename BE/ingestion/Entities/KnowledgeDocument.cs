using Caps.Common.Database;

namespace ingestion.Entities;

public sealed class KnowledgeDocument
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid LegalSourceId { get; set; }
    public LegalSource LegalSource { get; set; } = default!;

    public int VersionNo { get; set; }
    public string Source { get; set; } = default!;
    public Guid? CrawlJobId { get; set; }
    public CrawlJob? CrawlJob { get; set; }
    public Guid? UploadedBy { get; set; }
    public string FileUrl { get; set; } = default!;
    public string FileHash { get; set; } = default!;
    public string? ContentJson { get; set; } // jsonb
    public DateOnly? IssuedDate { get; set; }
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public string Status { get; set; } = "PENDING";
    public string? RejectionReason { get; set; }
    public Guid? ApprovedBy { get; set; }
    public DateTimeOffset? ApprovedAt { get; set; }
    public DateTimeOffset? IndexedAt { get; set; }
    public int RetryCount { get; set; }
    public string? LastError { get; set; }
    public string Metadata { get; set; } = "{}"; // jsonb
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<KbChunk> Chunks { get; set; } = new List<KbChunk>();
}
