using System.Text.Json.Nodes;
using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.CrawlJobs;

/// <summary>The worker's final report on a crawl job.</summary>
/// <param name="Detail">Summary of the exported documents, or the error.</param>
public sealed record CompleteCrawlJobCommand(
    Guid CrawlJobId,
    string Status,
    int DocsFound,
    JsonNode? Detail
);

/// <summary>Finishes a RUNNING job with the worker's status and summary.</summary>
public sealed class CompleteCrawlJobHandler(
    IngestionDbContext db,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<CompleteCrawlJobCommand, CrawlJobResponse>
{
    private static readonly string[] FinalStatuses =
    [
        CrawlJobStatuses.Succeeded,
        CrawlJobStatuses.Failed,
    ];

    public async Task<CrawlJobResponse> HandleAsync(
        CompleteCrawlJobCommand command,
        CancellationToken ct
    )
    {
        if (!FinalStatuses.Contains(command.Status))
            throw IngestionErrors.InvalidCrawlJobStatus(command.Status);
        var job =
            await db.CrawlJobs.FirstOrDefaultAsync(x => x.Id == command.CrawlJobId, ct)
            ?? throw IngestionErrors.CrawlJobNotFound();
        if (job.Status != CrawlJobStatuses.Running)
            throw IngestionErrors.CrawlJobNotRunning();
        job.Finish(command.Status, command.DocsFound, command.Detail, clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        return CrawlJobResponse.From(job);
    }
}
