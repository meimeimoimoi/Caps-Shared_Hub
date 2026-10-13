using Caps.Auth.Application.Common;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Auth.Api.Middleware;

/// <summary>
/// HTTP-level guards: CSRF header/origin on auth mutations, and session revocation for the
/// endpoints that change account state. The revocation rule itself lives in <see cref="ISessionGuard"/>.
/// </summary>
public sealed class AuthBoundaryMiddleware(RequestDelegate next)
{
    private static readonly string[] SessionCheckedExact =
    [
        "/api/v1/auth/logout",
        "/api/v1/auth/resend-verification",
        "/api/v1/auth/verify-email-code",
        "/api/v1/auth/change-password",
    ];

    public async Task InvokeAsync(
        HttpContext context,
        ISessionGuard sessions,
        ICurrentUser currentUser,
        IConfiguration config
    )
    {
        try
        {
            var path = context.Request.Path;
            if (context.Request.Method != "GET" && path.StartsWithSegments("/api/v1/auth"))
            {
                // Require an explicit header against form POST/CSRF; cross-origin JS must pass the CORS preflight.
                if (context.Request.Headers["X-Caps-Client"] != "spa")
                    throw CommonErrors.ClientHeaderRequired();
                var origin = context.Request.Headers.Origin.ToString();
                var allowed = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
                if (
                    origin.Length > 0
                    && !allowed.Contains(origin, StringComparer.OrdinalIgnoreCase)
                )
                    throw CommonErrors.OriginRejected();
            }
            var users = path.StartsWithSegments("/api/v1/users");
            if (currentUser.IsAuthenticated && (users || SessionCheckedExact.Contains(path.Value)))
                await sessions.EnsureValidAsync(
                    new(
                        currentUser.RequireUserId(),
                        context.User.FindFirst("token_version")?.Value,
                        context.User.FindFirst("account_status")?.Value
                    ),
                    requireCurrentStatus: users,
                    context.RequestAborted
                );
            await next(context);
        }
        // This middleware runs before the shared exception handler, so it writes the same error shape itself
        catch (AppException e)
        {
            await ApiErrors.WriteAsync(context, e, context.RequestAborted);
        }
    }
}
