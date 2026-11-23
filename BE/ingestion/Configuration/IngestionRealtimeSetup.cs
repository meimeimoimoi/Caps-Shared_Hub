using Caps.Ingestion.Realtime;

namespace Caps.Ingestion.Configuration;

/// <summary>SignalR hub that pushes crawl progress to admins.</summary>
public static class IngestionRealtimeSetup
{
    public const string CrawlJobsHubPath = "/api/v1/knowledge/hubs/crawl-jobs";

    // shortcut: in-memory SignalR, one ingestion instance only; add a Redis backplane before scaling out
    public static IServiceCollection AddIngestionRealtime(this IServiceCollection services)
    {
        services.AddSignalR();
        services.AddSingleton<ICrawlJobNotifier, SignalRCrawlJobNotifier>();
        return services;
    }
}
