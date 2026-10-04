using Caps.Common.Database;

namespace ingestion.Entities;

public sealed class CrawlJob
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public string TriggerType { get; set; } = default!;
    public Guid? TriggeredBy { get; set; }
    public string Status { get; set; } = "RUNNING";
    public int DocsFound { get; set; }
    public string? Detail { get; set; } // jsonb
    public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? FinishedAt { get; set; }

    public ICollection<KnowledgeDocument> KnowledgeDocuments { get; set; } = new List<KnowledgeDocument>();
}
