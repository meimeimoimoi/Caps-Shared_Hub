using System.Net;
using Microsoft.Extensions.Options;

namespace Caps.Cronjob.Jobs.MonthlyCrawl;

/// <summary>
/// Once the configured day and hour of the month have passed, asks ingestion for the month's scheduled crawl on
/// every check. Ingestion decides whether a run is still needed (and lets one crawl run at a time), so a
/// restart, a missed day or a second instance never starts a second crawl.
/// </summary>
public sealed class MonthlyCrawlJob(
    IHttpClientFactory httpClients,
    IOptions<MonthlyCrawlOptions> options,
    TimeProvider clock,
    ILogger<MonthlyCrawlJob> logger
) : BackgroundService
{
    public const string HttpClientName = "ingestion";

    // Vietnam has no daylight saving, so a fixed offset is exact.
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var o = options.Value;
        if (!o.Enabled)
        {
            logger.LogInformation("Monthly crawl is off (Jobs:MonthlyCrawl:Enabled = false).");
            return;
        }

        using var timer = new PeriodicTimer(o.CheckEvery, clock);
        do
        {
            await CheckAsync(o, stoppingToken);
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    /// <summary>True once the configured day and hour of this month have passed.</summary>
    public static bool IsDue(DateTimeOffset vietnamNow, int dayOfMonth, int hour) =>
        vietnamNow.Day > dayOfMonth || (vietnamNow.Day == dayOfMonth && vietnamNow.Hour >= hour);

    private async Task CheckAsync(MonthlyCrawlOptions o, CancellationToken ct)
    {
        if (!IsDue(clock.GetUtcNow().ToOffset(VietnamOffset), o.DayOfMonth, o.Hour))
            return;
        try
        {
            using var client = httpClients.CreateClient(HttpClientName);
            using var response = await client.PostAsJsonAsync(
                "internal/crawl-jobs/scheduled",
                new { sources = o.Sources, topN = o.TopN },
                ct
            );
            switch (response.StatusCode)
            {
                case HttpStatusCode.Accepted:
                    logger.LogInformation("Monthly crawl started.");
                    break;
                case HttpStatusCode.NoContent:
                    break;
                case HttpStatusCode.Conflict:
                    logger.LogInformation(
                        "A crawl is already running; trying again at the next check."
                    );
                    break;
                default:
                    logger.LogWarning(
                        "Ingestion refused the monthly crawl: {Status} {Body}",
                        (int)response.StatusCode,
                        await response.Content.ReadAsStringAsync(ct)
                    );
                    break;
            }
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            // An unhandled exception would stop the host; try again at the next check instead.
            logger.LogWarning(ex, "Could not reach ingestion for the monthly crawl.");
        }
    }
}
