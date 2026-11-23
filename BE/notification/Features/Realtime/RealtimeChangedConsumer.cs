using Caps.Contracts;
using MassTransit;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Notification.Features.Realtime;

/// <summary>Pushes a <see cref="RealtimeChangedEvent"/> from any service to the accounts and permission groups it names.</summary>
public sealed class RealtimeChangedConsumer(IHubContext<NotificationHub> hub)
    : IConsumer<RealtimeChangedEvent>
{
    public const string Method = "changed";

    public async Task Consume(ConsumeContext<RealtimeChangedEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        var payload = new { m.Topic };
        if (m.UserIds.Count > 0)
        {
            await hub
                .Clients.Users(m.UserIds.Select(x => x.ToString()).ToArray())
                .SendAsync(Method, payload, ct);
        }
        if (m.Permissions.Count > 0)
        {
            await hub
                .Clients.Groups(m.Permissions.Select(NotificationHub.PermissionGroup).ToArray())
                .SendAsync(Method, payload, ct);
        }
    }
}
