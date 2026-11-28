using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.CrawlJobs;

/// <summary>The cronjob service asks for this month's scheduled crawl.</summary>
public sealed record TriggerScheduledCrawlCommand(IReadOnlyList<string> Sources, int? TopN);

/// <summary>
/// Starts the month's scheduled crawl unless it already ran or is running, so the cronjob can call as often
/// as it likes (after a restart, or from two instances). A FAILED run is tried again, at most
/// <see cref="MaxAttemptsPerMonth"/> times a month, so a broken crawler does not start a run every hour.
/// </summary>
public sealed class TriggerScheduledCrawlHandler(
    IngestionDbContext db,
    ICommandHandler<TriggerCrawlCommand, CrawlJobResponse> trigger,
    TimeProvider clock
) : ICommandHandler<TriggerScheduledCrawlCommand, CrawlJobResponse?>
{
    public const int MaxAttemptsPerMonth = 3;

    // Months follow Vietnam time (UTC+7, no daylight saving), the admins' calendar.
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public async Task<CrawlJobResponse?> HandleAsync(
        TriggerScheduledCrawlCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        var monthStart = MonthStart(now);
        var runs = await db
            .CrawlJobs.Where(x =>
                x.TriggerType == CrawlTriggerTypes.Scheduled && x.StartedAt >= monthStart
            )
            .Select(x => new ScheduledRun(x.Status, x.StartedAt))
            .ToListAsync(ct);
        if (!ShouldStart(runs, now))
            return null;
        // Two callers passing this check at once still start one job: TriggerCrawl lets one run at a time.
        return await trigger.HandleAsync(new(null, command.Sources, command.TopN, false), ct);
    }

    /// <summary>Start of the month containing <paramref name="now"/>, in Vietnam time.</summary>
    public static DateTimeOffset MonthStart(DateTimeOffset now)
    {
        var local = now.ToOffset(VietnamOffset);
        // Npgsql only accepts UTC offsets for timestamptz parameters
        return new DateTimeOffset(
            local.Year,
            local.Month,
            1,
            0,
            0,
            0,
            VietnamOffset
        ).ToUniversalTime();
    }

    /// <summary>
    /// True while every scheduled run this month failed (or was lost: still RUNNING after
    /// <see cref="TriggerCrawlHandler.LostAfter"/>, which TriggerCrawl then marks FAILED) and attempts are left.
    /// </summary>
    public static bool ShouldStart(
        IReadOnlyCollection<ScheduledRun> monthRuns,
        DateTimeOffset now
    ) =>
        monthRuns.Count < MaxAttemptsPerMonth
        && monthRuns.All(r =>
            r.Status == CrawlJobStatuses.Failed
            || (
                r.Status == CrawlJobStatuses.Running
                && r.StartedAt <= now - TriggerCrawlHandler.LostAfter
            )
        );
}

/// <summary>A scheduled crawl run started this month.</summary>
public sealed record ScheduledRun(string Status, DateTimeOffset StartedAt);
