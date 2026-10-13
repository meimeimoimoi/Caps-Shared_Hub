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
}
