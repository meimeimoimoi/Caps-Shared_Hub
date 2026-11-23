using Caps.Common.Application;
using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Caps.Common.Messaging;

/// <summary>RabbitMQ connection details.</summary>
public sealed record MessagingOptions(string Host, string Username, string Password);

/// <summary>Registers MassTransit on RabbitMQ with the shared conventions, plus <see cref="IRealtimeNotifier"/>.</summary>
public static class MessagingServiceCollectionExtensions
{
    public static IServiceCollection AddCapsMessaging(
        this IServiceCollection services,
        IConfiguration config,
        Action<IBusRegistrationConfigurator>? configureConsumers = null
    )
    {
        var cs =
            config.GetConnectionString("RabbitMq")
            ?? config["ConnectionStrings:RabbitMq"]
            ?? "amqp://guest:guest@localhost:5672";

        var uri = new Uri(cs);
        // The path is the virtual host (amqp://user:pass@host:5672/caps_test); none means the default "/"
        var host = $"{uri.Scheme}://{uri.Host}:{uri.Port}{VirtualHostPath(uri)}";
        var user = GetUserInfo(uri, 0, "guest");
        var pass = GetUserInfo(uri, 1, "guest");

        services.AddMassTransit(x =>
        {
            configureConsumers?.Invoke(x);
            x.SetKebabCaseEndpointNameFormatter();
            x.UsingRabbitMq(
                (ctx, cfg) =>
                {
                    cfg.Host(
                        host,
                        h =>
                        {
                            h.Username(user);
                            h.Password(pass);
                        }
                    );
                    cfg.ConfigureEndpoints(ctx);
                }
            );
        });
        services.AddScoped<IRealtimeNotifier, RealtimeNotifier>();
        return services;
    }

    /// <summary>"/name" for a named virtual host, empty for the default one ("/" or no path).</summary>
    private static string VirtualHostPath(Uri uri)
    {
        var path = uri.AbsolutePath.TrimEnd('/');
        return path.Length == 0 ? "" : path;
    }

    private static string GetUserInfo(Uri uri, int index, string fallback)
    {
        var parts = (uri.UserInfo ?? "").Split(':', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > index ? Uri.UnescapeDataString(parts[index]) : fallback;
    }
}
