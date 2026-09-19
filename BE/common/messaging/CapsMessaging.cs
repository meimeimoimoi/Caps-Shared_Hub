using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Common.Messaging;

public sealed record MessagingOptions(string Host, string Username, string Password);

/// <summary>Sample contract — services share events via this lib.</summary>
public sealed record UserRegisteredEvent(string UserId, string Email, DateTimeOffset At);

public static class MessagingServiceCollectionExtensions
{
    public static IServiceCollection AddCapsMessaging(
        this IServiceCollection services,
        IConfiguration config,
        Action<IBusRegistrationConfigurator>? configureConsumers = null)
    {
        var cs = config.GetConnectionString("RabbitMq")
            ?? config["ConnectionStrings:RabbitMq"]
            ?? "amqp://guest:guest@localhost:5672";

        var uri = new Uri(cs);
        var host = $"{uri.Scheme}://{uri.Host}:{uri.Port}";
        var user = GetUserInfo(uri, 0, "guest");
        var pass = GetUserInfo(uri, 1, "guest");

        services.AddMassTransit(x =>
        {
            configureConsumers?.Invoke(x);
            x.SetKebabCaseEndpointNameFormatter();
            x.UsingRabbitMq((ctx, cfg) =>
            {
                cfg.Host(host, h =>
                {
                    h.Username(user);
                    h.Password(pass);
                });
                cfg.ConfigureEndpoints(ctx);
            });
        });
        return services;
    }

    private static string GetUserInfo(Uri uri, int index, string fallback)
    {
        var parts = (uri.UserInfo ?? "").Split(':', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > index ? Uri.UnescapeDataString(parts[index]) : fallback;
    }
}
