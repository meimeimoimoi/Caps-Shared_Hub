using Caps.Ingestion.DTOs.Responses;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Ingestion.Realtime;

/// <summary>Broadcasts to every hub connection; only knowledge admins can connect.</summary>
public sealed class SignalRCrawlJobNotifier(IHubContext<CrawlJobsHub> hub) : ICrawlJobNotifier
{
    public Task JobUpdatedAsync(CrawlJobResponse job, CancellationToken ct) =>
        hub.Clients.All.SendAsync("CrawlJobUpdated", job, ct);
}
