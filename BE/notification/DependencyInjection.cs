using Caps.Common.Persistence;
using Caps.Notification.Data;
using Caps.Notification.Email;

namespace Caps.Notification;

/// <summary>Registers email sending for the notification service.</summary>
public static class DependencyInjection
{
    /// <summary>SMTP delivery, validated at startup so a missing Smtp:Host or Smtp:From fails fast.</summary>
    public static IServiceCollection AddNotificationEmail(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services
            .AddOptions<SmtpOptions>()
            .Bind(config.GetSection("Smtp"))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddSingleton<IEmailSender, SmtpEmailSender>();
        services.AddSingleton(TimeProvider.System);
        return services;
    }

    /// <summary>In-app notifications stored in the notification schema, plus the links emails point to.</summary>
    public static IServiceCollection AddNotificationInbox(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        var postgres = config.GetRequiredConnectionString("Postgres");
        services.AddServiceDatabase<NotificationDbContext>(
            postgres,
            "Notification",
            "notification"
        );
        services
            .AddOptions<AppLinkOptions>()
            .Bind(config.GetSection("App"))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        return services;
    }
}
