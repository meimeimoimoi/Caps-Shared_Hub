using Microsoft.Extensions.Options;

namespace Caps.Cronjob.Jobs.MonthlyCrawl;

public static class MonthlyCrawlSetup
{
    /// <summary>Registers the monthly crawl job and the HTTP client it uses to call ingestion's /internal API.</summary>
    public static IServiceCollection AddMonthlyCrawl(this IServiceCollection services)
    {
        services
            .AddOptions<MonthlyCrawlOptions>()
            .BindConfiguration(MonthlyCrawlOptions.Section)
            .Validate(
                o => o.IsValid(),
                "Jobs:MonthlyCrawl needs DayOfMonth 1-28, Hour 0-23, Sources, CheckEvery, IngestionUrl and InternalKey when Enabled."
            )
            .ValidateOnStart();
        services.AddHttpClient(
            MonthlyCrawlJob.HttpClientName,
            (sp, client) =>
            {
                var o = sp.GetRequiredService<IOptions<MonthlyCrawlOptions>>().Value;
                client.BaseAddress = new Uri(o.IngestionUrl);
                client.DefaultRequestHeaders.Add("X-Internal-Key", o.InternalKey);
                client.Timeout = TimeSpan.FromSeconds(30);
            }
        );
        services.AddHostedService<MonthlyCrawlJob>();
        return services;
    }
}
