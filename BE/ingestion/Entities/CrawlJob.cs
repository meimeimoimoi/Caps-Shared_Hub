using Caps.Common.Domain;

namespace Caps.Ingestion.Entities;

/// <summary>One crawl run that looks for new legal documents, started on schedule or by an admin.</summary>
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

    public ICollection<KnowledgeDocument> KnowledgeDocuments { get; set; } =
        new List<KnowledgeDocument>();
}
