using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Stats;

/// <summary>Knowledge statistics over the last <paramref name="Months"/> calendar months, including the current one.</summary>
public sealed record GetKnowledgeStatsQuery(int Months);

/// <summary>
/// Counts run in the database; per-month figures load only the timestamps they group, never the content JSON.
/// </summary>
public sealed class GetKnowledgeStatsHandler(IngestionDbContext db, TimeProvider clock)
    : IQueryHandler<GetKnowledgeStatsQuery, KnowledgeStatsResponse>
{
    public const int RecentRunCount = 3;

    public async Task<KnowledgeStatsResponse> HandleAsync(
        GetKnowledgeStatsQuery query,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var months = StatMonths.Last(query.Months, now);
        var pipeline = await CountPipelineAsync(ct);
        var periods = await CountMonthsAsync(months, ct);
        var byDocType = await db
            .KnowledgeDocuments.AsNoTracking()
            .Where(x => x.Status == DocumentStatuses.Indexed)
            .GroupBy(x => x.LegalSource.DocType)
            .Select(g => new DocTypeCountResponse(
                g.Key,
                g.Select(x => x.LegalSourceId).Distinct().Count()
            ))
            .ToListAsync(ct);
        var pendingSince = await AwaitingReview().Select(x => x.CreatedAt).ToListAsync(ct);
        var pendingAges = pendingSince
            .GroupBy(at => (int)(now - at).TotalDays)
            .Select(g => new PendingAgeResponse(g.Key, g.Count()))
            .OrderBy(x => x.Days)
            .ToArray();
        var runs = await db
            .CrawlJobs.AsNoTracking()
            .OrderByDescending(x => x.StartedAt)
            .Take(RecentRunCount)
            .Select(x => new CrawlRunSummaryResponse(
                x.Id,
                x.TriggerType,
                x.Status,
                x.StartedAt,
                x.FinishedAt,
                x.DocsFound,
                x.KnowledgeDocuments.Count(d => d.VersionNo == 1),
                x.KnowledgeDocuments.Count(d => d.VersionNo > 1)
            ))
            .ToArrayAsync(ct);
        return new KnowledgeStatsResponse(
            pipeline,
            periods,
            [.. byDocType.OrderByDescending(x => x.Count)],
            pendingAges,
            runs
        );
    }

    private IQueryable<Entities.KnowledgeDocument> AwaitingReview() =>
        db
            .KnowledgeDocuments.AsNoTracking()
            .Where(x =>
                x.Status == DocumentStatuses.Pending && x.ContentJson != null && x.LastError == null
            );

    private async Task<KnowledgePipelineResponse> CountPipelineAsync(CancellationToken ct)
    {
        // One grouped query: status, whether content exists and whether the last step failed
        var groups = await db
            .KnowledgeDocuments.AsNoTracking()
            .GroupBy(x => new
            {
                x.Status,
                HasContent = x.ContentJson != null,
                Failed = x.LastError != null,
            })
            .Select(g => new
            {
                g.Key.Status,
                g.Key.HasContent,
                g.Key.Failed,
                Count = g.Count(),
            })
            .ToListAsync(ct);
        int Sum(Func<string, bool, bool, bool> match) =>
            groups.Where(g => match(g.Status, g.HasContent, g.Failed)).Sum(g => g.Count);
        return new KnowledgePipelineResponse(
            AwaitingContent: Sum((s, c, f) => s == DocumentStatuses.Pending && !c && !f),
            AwaitingReview: Sum((s, c, f) => s == DocumentStatuses.Pending && c && !f),
            Approved: Sum((s, _, f) => s == DocumentStatuses.Approved && !f),
            Indexed: Sum((s, _, _) => s == DocumentStatuses.Indexed),
            Rejected: Sum((s, _, _) => s == DocumentStatuses.Rejected),
            ParseFailed: Sum((s, _, f) => s == DocumentStatuses.Pending && f),
            IndexFailed: Sum((s, _, f) => s == DocumentStatuses.Approved && f)
        );
    }

    private async Task<KnowledgeStatPeriodResponse[]> CountMonthsAsync(
        IReadOnlyList<StatMonth> months,
        CancellationToken ct
    )
    {
        var start = months[0].Start;
        var endBefore = months[^1].End;
        var arrived = await db
            .KnowledgeDocuments.AsNoTracking()
            .Where(x => x.CreatedAt >= start && x.CreatedAt < endBefore)
            .Select(x => new { x.CreatedAt, x.Source })
            .ToListAsync(ct);
        var indexed = await db
            .KnowledgeDocuments.AsNoTracking()
            .Where(x => x.IndexedAt >= start && x.IndexedAt < endBefore)
            .Select(x => new { IndexedAt = x.IndexedAt!.Value, x.VersionNo })
            .ToListAsync(ct);
        var crawled = new int[months.Count];
        var uploaded = new int[months.Count];
        var newDocuments = new int[months.Count];
        var newVersions = new int[months.Count];
        foreach (var doc in arrived)
        {
            var i = StatMonths.IndexOf(months, doc.CreatedAt);
            if (i < 0)
                continue;
            if (doc.Source == DocumentSources.ManualUpload)
                uploaded[i]++;
            else
                crawled[i]++;
        }
        foreach (var doc in indexed)
        {
            var i = StatMonths.IndexOf(months, doc.IndexedAt);
            if (i < 0)
                continue;
            if (doc.VersionNo == 1)
                newDocuments[i]++;
            else
                newVersions[i]++;
        }
        return months
            .Select(
                (month, i) =>
                    new KnowledgeStatPeriodResponse(
                        month.Key,
                        month.Partial,
                        crawled[i],
                        uploaded[i],
                        newDocuments[i],
                        newVersions[i]
                    )
            )
            .ToArray();
    }
}
