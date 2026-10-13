using Caps.Common.Application;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using StackExchange.Redis;

namespace Caps.Common.Security;

public static class SessionRevocationSetup
{
    /// <summary>
    /// Registers the Redis revocation store when ConnectionStrings:Redis is set; without it the service
    /// skips the check (and trusts tokens until they expire).
    /// </summary>
    public static IServiceCollection AddCapsSessionRevocation(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        var connection = config.GetConnectionString("Redis");
        if (string.IsNullOrWhiteSpace(connection))
            return services;
        var redis = ConfigurationOptions.Parse(connection);
        // Start even while Redis is down and reconnect in the background; fail fast instead of hanging
        redis.AbortOnConnectFail = false;
        redis.ConnectTimeout = 2000;
        redis.SyncTimeout = 1000;
        redis.AsyncTimeout = 1000;
        services.TryAddSingleton<IConnectionMultiplexer>(_ => ConnectionMultiplexer.Connect(redis));
        services.AddSingleton(
            config.GetSection("Sessions").Get<SessionRevocationOptions>()
                ?? new SessionRevocationOptions()
        );
        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<ISessionRevocationStore, RedisSessionRevocationStore>();
        return services;
    }
}
