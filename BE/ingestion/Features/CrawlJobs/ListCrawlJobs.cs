using Caps.Common.Application;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.CrawlJobs;

/// <summary>One page of crawl runs.</summary>
public sealed record ListCrawlJobsQuery(int Page, int PageSize);

/// <summary>Lists crawl runs, newest first.</summary>
public sealed class ListCrawlJobsHandler(IngestionDbContext db)
    : IQueryHandler<ListCrawlJobsQuery, PageResponse<CrawlJobResponse>>
{
    public async Task<PageResponse<CrawlJobResponse>> HandleAsync(
        ListCrawlJobsQuery query,
        CancellationToken ct
    )
    {
        Paging.Ensure(query.Page, query.PageSize);
        var total = await db.CrawlJobs.CountAsync(ct);
        var jobs = await db
            .CrawlJobs.AsNoTracking()
            .OrderByDescending(x => x.StartedAt)
            .ThenByDescending(x => x.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);
        return new(jobs.ConvertAll(CrawlJobResponse.From), query.Page, query.PageSize, total);
    }
}
