using Caps.Common.Application;
using Caps.Contracts;
using MassTransit;
using Microsoft.Extensions.Logging;

namespace Caps.Common.Messaging;

/// <summary>Publishes <see cref="RealtimeChangedEvent"/> to RabbitMQ for the notification service's hub.</summary>
public sealed class RealtimeNotifier(
    IPublishEndpoint bus,
    TimeProvider clock,
    ILogger<RealtimeNotifier> logger
) : IRealtimeNotifier
{
    public async Task ChangedAsync(
        string topic,
        IReadOnlyCollection<Guid> userIds,
        IReadOnlyCollection<Permission> permissions,
        CancellationToken ct
    )
    {
        try
        {
            await bus.Publish(
                new RealtimeChangedEvent(
                    Guid.NewGuid(),
                    topic,
                    userIds.Distinct().ToArray(),
                    permissions.Select(x => x.ToString()).Distinct().ToArray(),
                    clock.GetUtcNow()
                ),
                ct
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Clients still see the change on their next fetch
            logger.LogWarning(ex, "Real-time change {Topic} was not published", topic);
        }
    }
}

/// <summary>Used when messaging is switched off (Development only): changes are simply not pushed.</summary>
public sealed class NoRealtimeNotifier : IRealtimeNotifier
{
    public Task ChangedAsync(
        string topic,
        IReadOnlyCollection<Guid> userIds,
        IReadOnlyCollection<Permission> permissions,
        CancellationToken ct
    ) => Task.CompletedTask;
}
