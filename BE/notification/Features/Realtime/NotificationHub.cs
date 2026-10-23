using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Notification.Features.Realtime;

/// <summary>
/// Real-time channel for every signed-in tab. Clients only listen: <see cref="NotificationPush"/> sends to one
/// account, <see cref="RealtimeChangedConsumer"/> to accounts or to everyone holding a permission.
/// </summary>
[Authorize(Policy = "AuthSession")]
public sealed class NotificationHub : Hub
{
    public const string Path = "/api/v1/notifications/hub";

    /// <summary>SignalR group of the connections whose token carries this permission.</summary>
    public static string PermissionGroup(string permission) => $"permission:{permission}";

    /// <summary>Joins one group per permission claim; a token renewed with other permissions applies on reconnect.</summary>
    public override async Task OnConnectedAsync()
    {
        foreach (var claim in Context.User?.FindAll("permission") ?? [])
            await Groups.AddToGroupAsync(Context.ConnectionId, PermissionGroup(claim.Value));
        await base.OnConnectedAsync();
    }
}
