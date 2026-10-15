using System.Globalization;
using System.Threading.RateLimiting;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.RateLimiting;

namespace Caps.Gateway.RateLimiting;

/// <summary>Per-IP request limits, bound from the "RateLimits" section.</summary>
public sealed class GatewayRateLimitOptions
{
    /// <summary>Requests per minute per IP on /api/v1/auth (login, register, password reset...).</summary>
    public int AuthPerMinute { get; set; } = 30;

    /// <summary>Requests per minute per IP on every other API route.</summary>
    public int ApiPerMinute { get; set; } = 300;
}

/// <summary>
/// Rate limits at the edge. The gateway is the first hop, so the connection address is the real client IP
/// and no forwarded header has to be trusted. Routes pick a policy with <c>RateLimiterPolicy</c> in the
/// ReverseProxy config.
/// </summary>
public static class GatewayRateLimitSetup
{
    public const string AuthPolicy = "auth";
    public const string ApiPolicy = "api";

    public static IServiceCollection AddGatewayRateLimits(
        this IServiceCollection services,
        IConfiguration config
    )
    {
        var options =
            config.GetSection("RateLimits").Get<GatewayRateLimitOptions>()
            ?? new GatewayRateLimitOptions();
        services.AddRateLimiter(o =>
        {
            o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            o.OnRejected = WriteRejectionAsync;
            o.AddPolicy(AuthPolicy, context => PerIp(context, options.AuthPerMinute));
            o.AddPolicy(ApiPolicy, context => PerIp(context, options.ApiPerMinute));
        });
        return services;
    }

    private static RateLimitPartition<string> PerIp(HttpContext context, int perMinute) =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = perMinute,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
            }
        );

    // Same error shape as the services, so the frontend handles a gateway 429 like any other
    private static async ValueTask WriteRejectionAsync(
        OnRejectedContext context,
        CancellationToken ct
    )
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = (
                (int)Math.Ceiling(retryAfter.TotalSeconds)
            ).ToString(CultureInfo.InvariantCulture);
        }
        await ApiErrors.WriteAsync(context.HttpContext, CommonErrors.TooManyRequests(), ct);
    }
}
