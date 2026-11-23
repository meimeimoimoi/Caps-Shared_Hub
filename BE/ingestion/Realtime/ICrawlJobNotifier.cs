using Caps.Ingestion.DTOs.Responses;

namespace Caps.Ingestion.Realtime;

/// <summary>Tells connected admins that a crawl job changed (new stage or final status).</summary>
public interface ICrawlJobNotifier
{
    Task JobUpdatedAsync(CrawlJobResponse job, CancellationToken ct);
}
