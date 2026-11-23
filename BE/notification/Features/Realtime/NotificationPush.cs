using Caps.Notification.Entities;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Notification.Features.Realtime;

/// <summary>
/// Tells the account's open tabs that a notification was stored, so they refetch instead of waiting for a reload.
/// The payload only names the notification; the client reads the content through the REST API.
/// </summary>
public sealed class NotificationPush(
    IHubContext<NotificationHub> hub,
    ILogger<NotificationPush> logger
)
{
    public const string CreatedMethod = "notificationCreated";

    /// <summary>Best effort: a failed push is logged and never fails the consumer (the email still goes out).</summary>
    public async Task CreatedAsync(UserNotification notification, CancellationToken ct)
    {
        try
        {
            await hub
                .Clients.User(notification.UserId.ToString())
                .SendAsync(CreatedMethod, new { notification.Id, notification.Type }, ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Real-time push for notification {Id} failed", notification.Id);
        }
    }
}
