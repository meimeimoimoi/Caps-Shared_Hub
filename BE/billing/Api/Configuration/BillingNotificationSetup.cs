using Caps.Billing.Infrastructure.Messaging;
using Caps.Common.Messaging;

namespace Caps.Billing.Api.Configuration;

/// <summary>Publishes outbox messages (payout notices to experts) to RabbitMQ for the notification service.</summary>
public static class BillingNotificationSetup
{
    /// <summary>The outbox publisher; it may be switched off only in Development (messages then stay queued).</summary>
    public static IServiceCollection AddBillingNotifications(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        if (config.GetValue("Billing:NotificationPublisherEnabled", true))
        {
            services.AddCapsMessaging(config);
            services.AddHostedService<BillingNotificationPublisher>();
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
