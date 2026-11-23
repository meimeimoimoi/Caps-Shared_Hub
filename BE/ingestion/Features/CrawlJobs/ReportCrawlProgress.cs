using System.Text.Json.Nodes;
using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Realtime;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.CrawlJobs;

/// <summary>A milestone the worker reached while running a crawl job.</summary>
/// <param name="Stage">SEARCHING, DETAILS, RELATIONS, EXPORTING or POSTING.</param>
/// <param name="Total">Items in the stage, when known.</param>
public sealed record ReportCrawlProgressCommand(
    Guid CrawlJobId,
    string Stage,
    int Done,
    int? Total,
    string? Message
);

/// <summary>Stores the latest milestone of a RUNNING job and pushes it to connected admins.</summary>
public sealed class ReportCrawlProgressHandler(
    IngestionDbContext db,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    ICrawlJobNotifier notifier
) : ICommandHandler<ReportCrawlProgressCommand>
{
    public async Task HandleAsync(ReportCrawlProgressCommand command, CancellationToken ct)
    {
        var job =
            await db.CrawlJobs.FirstOrDefaultAsync(x => x.Id == command.CrawlJobId, ct)
            ?? throw IngestionErrors.CrawlJobNotFound();
        if (job.Status != CrawlJobStatuses.Running)
            throw IngestionErrors.CrawlJobNotRunning();
        var progress = new JsonObject
        {
            ["stage"] = command.Stage,
            ["done"] = command.Done,
            ["total"] = command.Total,
            ["message"] = command.Message,
        };
        job.ReportProgress(progress, clock.GetUtcNow());
        await unitOfWork.SaveChangesAsync(ct);
        await notifier.JobUpdatedAsync(CrawlJobResponse.From(job), ct);
    }
}
