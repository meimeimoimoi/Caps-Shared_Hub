using Caps.Common.Messaging;
using Caps.Expert.Infrastructure.Messaging;

namespace Caps.Expert.Api.Configuration;

/// <summary>Publishes outbox messages (Gate 1 decisions) to RabbitMQ for the notification service.</summary>
public static class ExpertNotificationSetup
{
    /// <summary>The outbox publisher; it may be switched off only in Development (messages then stay queued).</summary>
    public static IServiceCollection AddExpertNotifications(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        if (config.GetValue("Expert:NotificationPublisherEnabled", true))
        {
            services.AddCapsMessaging(config);
            services.AddHostedService<ExpertNotificationPublisher>();
        }
        else if (!env.IsDevelopment())
        {
            throw new InvalidOperationException(
                "Notification publishing may only be disabled in Development."
            );
        }
        return services;
    }
}
