namespace Caps.Cronjob.Jobs.MonthlyCrawl;

/// <summary>Jobs:MonthlyCrawl: when the monthly crawl is due and how to ask ingestion for it.</summary>
public sealed class MonthlyCrawlOptions
{
    public const string Section = "Jobs:MonthlyCrawl";

    public bool Enabled { get; set; }

    /// <summary>Day of the month (1-28) from which the crawl is due, in Vietnam time.</summary>
    public int DayOfMonth { get; set; } = 1;

    /// <summary>Hour (0-23) on <see cref="DayOfMonth"/> from which the crawl is due, in Vietnam time.</summary>
    public int Hour { get; set; } = 2;

    /// <summary>vbpl and/or mof; the default list lives in appsettings.json (the binder appends to arrays).</summary>
    public string[] Sources { get; set; } = [];

    /// <summary>Newest documents per document type; null uses the crawler default.</summary>
    public int? TopN { get; set; }

    /// <summary>How often the job wakes up to check; ingestion ignores calls once the month's run exists.</summary>
    public TimeSpan CheckEvery { get; set; } = TimeSpan.FromHours(1);

    /// <summary>Base URL of the ingestion service (its /internal endpoints are not behind the gateway).</summary>
    public string IngestionUrl { get; set; } = "";

    /// <summary>ingestion's InternalApi:Key; keep it in user-secrets or the environment.</summary>
    public string InternalKey { get; set; } = "";

    public bool IsValid() =>
        !Enabled
        || (
            DayOfMonth is >= 1 and <= 28
            && Hour is >= 0 and <= 23
            && Sources.Length > 0
            && CheckEvery > TimeSpan.Zero
            && Uri.TryCreate(IngestionUrl, UriKind.Absolute, out _)
            && !string.IsNullOrWhiteSpace(InternalKey)
        );
}
