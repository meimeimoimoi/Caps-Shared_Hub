using Caps.Auth.Application;
using Caps.Auth.Domain.Users;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Caps.Auth.Api.Middleware;

public sealed class AuthBoundaryMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(
        HttpContext context,
        AuthDbContext db,
        IOptions<AuthOptions> options,
        IConfiguration config
    )
    {
        try
        {
            if (
                context.Request.Method != "GET"
                && context.Request.Path.StartsWithSegments("/api/v1/auth")
            )
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
            if (
                context.User.Identity?.IsAuthenticated == true
                && (
                    context.Request.Path.StartsWithSegments("/api/v1/users")
                    || context.Request.Path.StartsWithSegments("/api/v1/experts")
                    || context.Request.Path == "/api/v1/auth/logout"
                    || context.Request.Path == "/api/v1/auth/resend-verification"
                    || context.Request.Path == "/api/v1/auth/verify-email-code"
                    || context.Request.Path == "/api/v1/auth/change-password"
                )
            )
            {
                if (!Guid.TryParse(context.User.FindFirst("sub")?.Value, out var id))
                    throw CommonErrors.InvalidSession("Invalid session.");
                var user = await db
                    .Users.AsNoTracking()
                    .SingleOrDefaultAsync(x => x.Id == id, context.RequestAborted);
                if (
                    user == null
                    || (user.Status != "ACTIVE" && user.Status != "PENDING_VERIFICATION")
                    || context.User.FindFirst("token_version")?.Value
                        != user.TokenVersion.ToString()
                )
                    throw CommonErrors.InvalidSession("Session revoked.");
            }
            // When the current role/status changes, a new token is required; never trust stale claims.
            if (
                context.User.Identity?.IsAuthenticated == true
                && context.Request.Path.StartsWithSegments("/api/v1/users")
            )
            {
                var currentId = Guid.Parse(context.User.FindFirst("sub")!.Value);
                var account = await db
                    .Users.AsNoTracking()
                    .SingleAsync(x => x.Id == currentId, context.RequestAborted);
                if (context.User.FindFirst("account_status")?.Value != account.Status)
                    throw CommonErrors.RefreshRequired(
                        "Refresh the session after account status changes."
                    );
            }
            await next(context);
        }
        // This middleware runs before the shared exception handler, so it writes the same error shape itself
        catch (AppException e)
        {
            await ApiErrors.WriteAsync(context, e, context.RequestAborted);
        }
    }
}
