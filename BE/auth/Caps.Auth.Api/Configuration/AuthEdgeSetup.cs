using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;

namespace Caps.Auth.Api.Configuration;

/// <summary>Trusted proxies and the per-IP rate limit on auth endpoints.</summary>
public static class AuthEdgeSetup
{
    /// <summary>Trusted proxies and the per-IP rate limit on auth endpoints.</summary>
    public static IServiceCollection AddAuthEdge(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        services.Configure<ForwardedHeadersOptions>(o =>
        {
            o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            foreach (var proxy in config.GetSection("Auth:KnownProxies").Get<string[]>() ?? [])
                o.KnownProxies.Add(System.Net.IPAddress.Parse(proxy));
        });
        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = 429;
            o.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                context.Request.Path.StartsWithSegments("/api/v1/auth")
                    ? RateLimitPartition.GetFixedWindowLimiter(
                        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                        _ => new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = 30,
                            Window = TimeSpan.FromMinutes(1),
                            QueueLimit = 0,
                        }
                    )
                    : RateLimitPartition.GetNoLimiter("other")
            );
        });
        return services;
    }
}
