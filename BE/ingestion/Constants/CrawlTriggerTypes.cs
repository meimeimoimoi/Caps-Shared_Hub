namespace Caps.Ingestion.Constants;

/// <summary>Values of crawl_job.trigger_type.</summary>
public static class CrawlTriggerTypes
{
    public const string Manual = "MANUAL";

    /// <summary>Started by the monthly schedule in the cronjob service; triggered_by is null.</summary>
    public const string Scheduled = "SCHEDULED";
}
