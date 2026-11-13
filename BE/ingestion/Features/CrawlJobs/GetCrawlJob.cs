using Caps.Common.Application;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.CrawlJobs;

/// <summary>One crawl job, polled while it runs.</summary>
public sealed record GetCrawlJobQuery(Guid CrawlJobId);

/// <summary>Returns the job with its request, latest progress and, once finished, the result.</summary>
public sealed class GetCrawlJobHandler(IngestionDbContext db)
    : IQueryHandler<GetCrawlJobQuery, CrawlJobResponse>
{
    public async Task<CrawlJobResponse> HandleAsync(GetCrawlJobQuery query, CancellationToken ct)
    {
        var job =
            await db.CrawlJobs.AsNoTracking().FirstOrDefaultAsync(x => x.Id == query.CrawlJobId, ct)
            ?? throw IngestionErrors.CrawlJobNotFound();
        return CrawlJobResponse.From(job);
    }
}
