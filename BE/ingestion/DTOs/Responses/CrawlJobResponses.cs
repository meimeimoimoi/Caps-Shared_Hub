using System.Text.Json;
using Caps.Ingestion.Entities;

namespace Caps.Ingestion.DTOs.Responses;

/// <summary>One crawl run; detail holds the request (sources, topN, all) and, once finished, the result.</summary>
public sealed record CrawlJobResponse(
    Guid Id,
    string TriggerType,
    Guid? TriggeredBy,
    string Status,
    int DocsFound,
    JsonElement? Detail,
    DateTimeOffset StartedAt,
    DateTimeOffset? FinishedAt
)
{
    public static CrawlJobResponse From(CrawlJob x) =>
        new(
            x.Id,
            x.TriggerType,
            x.TriggeredBy,
            x.Status,
            x.DocsFound,
            JsonColumn.Read(x.Detail),
            x.StartedAt,
            x.FinishedAt
        );
}
