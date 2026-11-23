using Microsoft.Net.Http.Headers;

namespace Caps.Gateway.Security;

/// <summary>
/// Adds browser security headers to every response leaving the gateway, including proxied ones and errors.
/// API responses are JSON, so they also forbid rendering, framing and caching (unless the service already
/// chose a cache policy, e.g. versioned avatars).
/// </summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    private const string ApiCsp = "default-src 'none'; frame-ancestors 'none'";

    public Task InvokeAsync(HttpContext context)
    {
        var isApi = context.Request.Path.StartsWithSegments("/api");
        // OnStarting runs after YARP copied the service's headers, so these win over upstream values
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.XContentTypeOptions = "nosniff";
            headers.XFrameOptions = "DENY";
            headers["Referrer-Policy"] = "no-referrer";
            // Do not reveal the server software (the services' own Server header is copied by YARP)
            headers.Remove(HeaderNames.Server);
            if (isApi)
            {
                headers.ContentSecurityPolicy = ApiCsp;
                if (string.IsNullOrEmpty(headers.CacheControl))
                    headers.CacheControl = "no-store";
            }
            return Task.CompletedTask;
        });
        return next(context);
    }
}
