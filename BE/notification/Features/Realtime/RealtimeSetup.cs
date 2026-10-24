using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;

namespace Caps.Notification.Features.Realtime;

/// <summary>Registers SignalR for in-app notifications.</summary>
public static class RealtimeSetup
{
    /// <summary>
    /// SignalR plus bearer auth for the hub: browsers cannot set headers on a WebSocket, so the token comes
    /// from the access_token query string, and only on the hub path.
    /// </summary>
    public static IServiceCollection AddNotificationRealtime(this IServiceCollection services)
    {
        services.AddSignalR();
        services.AddSingleton<IUserIdProvider, SubjectUserIdProvider>();
        services.AddSingleton<NotificationPush>();
        services.PostConfigure<JwtBearerOptions>(
            JwtBearerDefaults.AuthenticationScheme,
            o =>
            {
                var previous = o.Events.OnMessageReceived;
                o.Events.OnMessageReceived = async context =>
                {
                    await previous(context);
                    var token = context.Request.Query["access_token"].ToString();
                    if (
                        context.Token == null
                        && token.Length > 0
                        && context.HttpContext.Request.Path.StartsWithSegments(NotificationHub.Path)
                    )
                    {
                        context.Token = token;
                    }
                };
            }
        );
        return services;
    }
}
