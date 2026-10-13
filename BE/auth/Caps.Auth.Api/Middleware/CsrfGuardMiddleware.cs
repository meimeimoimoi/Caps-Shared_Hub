using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Auth.Api.Middleware;

/// <summary>
/// CSRF guard for state-changing auth requests: they must carry <c>X-Caps-Client: spa</c> (a plain HTML form
/// cannot set it) and, when the browser sends an Origin, come from an allowed origin.
/// </summary>
public sealed class CsrfGuardMiddleware(RequestDelegate next, IConfiguration config)
{
    private readonly string[] _allowedOrigins =
        config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Method != "GET" && context.Request.Path.StartsWithSegments("/api/v1/auth"))
        {
            try
            {
                EnsureFromSpa(context.Request);
            }
            // Runs before the shared exception handler, so it writes the shared error shape itself
            catch (AppException e)
            {
                await ApiErrors.WriteAsync(context, e, context.RequestAborted);
                return;
            }
        }
        await next(context);
    }

    private void EnsureFromSpa(HttpRequest request)
    {
        if (request.Headers["X-Caps-Client"] != "spa")
            throw CommonErrors.ClientHeaderRequired();
        var origin = request.Headers.Origin.ToString();
        if (origin.Length > 0 && !_allowedOrigins.Contains(origin, StringComparer.OrdinalIgnoreCase))
            throw CommonErrors.OriginRejected();
    }
}
