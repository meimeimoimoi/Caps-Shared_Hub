using System.Text.Json.Nodes;
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

    public ICollection<KnowledgeDocument> KnowledgeDocuments { get; set; } = [];

    /// <summary>Ends the run; the result is kept next to the original request in <see cref="Detail"/>.</summary>
    public void Finish(string status, int docsFound, JsonNode? result, DateTimeOffset now)
    {
        JsonObject detail = Detail is null ? [] : JsonNode.Parse(Detail)!.AsObject();
        detail["result"] = result;
        Status = status;
        DocsFound = docsFound;
        Detail = detail.ToJsonString();
        FinishedAt = now;
    }
}
