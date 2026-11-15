using System.Net;
using Microsoft.AspNetCore.HttpOverrides;

namespace Caps.Gateway.Security;

/// <summary>Configures trusted reverse proxies so rate limits and upstream services see real client IPs.</summary>
public static class GatewayForwardedHeadersSetup
{
    /// <summary>Reads Gateway:KnownProxies and enables X-Forwarded-For / X-Forwarded-Proto processing.</summary>
    public static IServiceCollection AddGatewayForwardedHeaders(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services.Configure<ForwardedHeadersOptions>(o =>
        {
            o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            foreach (var proxy in config.GetSection("Gateway:KnownProxies").Get<string[]>() ?? [])
            {
                if (IPAddress.TryParse(proxy, out var ip))
                {
                    o.KnownProxies.Add(ip);
                }
            }
        });
        return services;
    }
}
