using Caps.Ingestion.Constants;
using Caps.Ingestion.Features.CrawlJobs;

namespace Caps.Ingestion.UnitTests;

public sealed class ScheduledCrawlTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 3, 0, 0, TimeSpan.Zero);

    private static ScheduledRun Run(string status, double hoursAgo = 1) =>
        new(status, Now.AddHours(-hoursAgo));

    [Fact]
    public void Month_follows_vietnam_time()
    {
        // 18:00 UTC on 31 Oct is already 1 Nov 01:00 in Vietnam
        var start = TriggerScheduledCrawlHandler.MonthStart(
            new DateTimeOffset(2026, 10, 31, 18, 0, 0, TimeSpan.Zero)
        );

        Assert.Equal(new DateTimeOffset(2026, 10, 31, 17, 0, 0, TimeSpan.Zero), start);
        Assert.Equal(TimeSpan.Zero, start.Offset);
    }

    [Fact]
    public void Starts_when_nothing_ran_this_month() =>
        Assert.True(TriggerScheduledCrawlHandler.ShouldStart([], Now));

    [Theory]
    [InlineData(CrawlJobStatuses.Succeeded)]
    [InlineData(CrawlJobStatuses.Running)]
    public void Skips_once_a_run_succeeded_or_is_running(string status) =>
        Assert.False(
            TriggerScheduledCrawlHandler.ShouldStart(
                [Run(CrawlJobStatuses.Failed), Run(status)],
                Now
            )
        );

    [Fact]
    public void Retries_failed_and_lost_runs_up_to_the_monthly_limit()
    {
        Assert.True(
            TriggerScheduledCrawlHandler.ShouldStart(
                [Run(CrawlJobStatuses.Failed), Run(CrawlJobStatuses.Running, hoursAgo: 13)],
                Now
            )
        );
        Assert.False(
            TriggerScheduledCrawlHandler.ShouldStart(
                [
                    Run(CrawlJobStatuses.Failed),
                    Run(CrawlJobStatuses.Failed),
                    Run(CrawlJobStatuses.Failed),
                ],
                Now
            )
        );
    }
}
