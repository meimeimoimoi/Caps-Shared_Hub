using Caps.Common.Messaging;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Infrastructure.Messaging;

namespace Caps.Workflow.Api.Configuration;

/// <summary>Publishes review case events to RabbitMQ for the notification service.</summary>
public static class WorkflowNotificationSetup
{
    /// <summary>The publisher; it may be switched off only in Development (events are then dropped).</summary>
    public static IServiceCollection AddWorkflowNotifications(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        if (config.GetValue("Workflow:NotificationPublisherEnabled", true))
        {
            services.AddCapsMessaging(
                config,
                x => x.AddConsumer<RefundOnServiceSuspendedConsumer>()
            );
            services.AddScoped<IReviewCaseEvents, MassTransitReviewCaseEvents>();
        }
        else if (!env.IsDevelopment())
        {
            throw new InvalidOperationException(
                "Notification publishing may only be disabled in Development."
            );
        }
        else
        {
            services.AddScoped<IReviewCaseEvents, NoReviewCaseEvents>();
        }
        return services;
    }
}
