using System.Text.Json;
using System.Text.Json.Nodes;
using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Entities;
using Caps.Ingestion.Messaging;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.CrawlJobs;

/// <summary>An admin starts a crawl of the given sources.</summary>
public sealed record TriggerCrawlCommand(
    Guid UserId,
    IReadOnlyList<string> Sources,
    int? TopN,
    bool All
);

/// <summary>
/// Creates the job and asks the crawler worker to run it. One job runs at a time; a job still RUNNING after
/// <see cref="LostAfter"/> is taken as lost (worker stopped mid-run) and marked FAILED so it stops blocking.
/// </summary>
public sealed class TriggerCrawlHandler(
    IngestionDbContext db,
    IUnitOfWork unitOfWork,
    IPublishEndpoint publisher,
    TimeProvider clock
) : ICommandHandler<TriggerCrawlCommand, CrawlJobResponse>
{
    private static readonly string[] KnownSources = ["vbpl", "mof"];
    private static readonly TimeSpan LostAfter = TimeSpan.FromHours(12);

    public async Task<CrawlJobResponse> HandleAsync(
        TriggerCrawlCommand command,
        CancellationToken ct
    )
    {
        var sources = command
            .Sources.Select(x => (x ?? "").Trim().ToLowerInvariant())
            .Distinct()
            .ToArray();
        var unknown = Array.Find(sources, x => !KnownSources.Contains(x));
        if (unknown != null)
            throw IngestionErrors.InvalidCrawlSource(unknown);
        var topN = command.All ? null : command.TopN;

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        // Serializes concurrent triggers, so two admins cannot both pass the RUNNING check
        await db.Database.ExecuteSqlRawAsync(
            "SELECT pg_advisory_xact_lock(hashtextextended('knowledge.crawl_job', 0))",
            ct
        );
        var now = clock.GetUtcNow();
        var running = await db
            .CrawlJobs.Where(x => x.Status == CrawlJobStatuses.Running)
            .ToListAsync(ct);
        if (running.Exists(x => x.StartedAt > now - LostAfter))
            throw IngestionErrors.CrawlAlreadyRunning();
        foreach (var lost in running)
        {
            var error = new JsonObject { ["error"] = "No result from the crawler worker." };
            lost.Finish(CrawlJobStatuses.Failed, lost.DocsFound, error, now);
        }

        var job = new CrawlJob
        {
            TriggerType = CrawlTriggerTypes.Manual,
            TriggeredBy = command.UserId,
            Status = CrawlJobStatuses.Running,
            Detail = JsonSerializer.Serialize(
                new
                {
                    request = new
                    {
                        sources,
                        topN,
                        all = command.All,
                    },
                }
            ),
            StartedAt = now,
        };
        db.CrawlJobs.Add(job);
        await unitOfWork.SaveChangesAsync(ct);
        // Published before commit: when RabbitMQ is down the job is rolled back instead of staying RUNNING
        await publisher.Publish(new CrawlRequested(job.Id, sources, topN, command.All), ct);
        await tx.CommitAsync(ct);
        return CrawlJobResponse.From(job);
    }
}
