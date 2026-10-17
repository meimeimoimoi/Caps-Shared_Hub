using Caps.Auth.Application.Common;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Auth.Api.Middleware;

/// <summary>
/// Checks the signed-in session against auth's own database on the endpoints that change account state.
/// The rule itself lives in <see cref="ISessionGuard"/>; other services rely on the shared revocation store.
/// </summary>
public sealed class SessionGuardMiddleware(RequestDelegate next)
{
    private static readonly string[] SessionCheckedPaths =
    [
        "/api/v1/auth/logout",
        "/api/v1/auth/resend-verification",
        "/api/v1/auth/verify-email-code",
        "/api/v1/auth/change-password",
    ];

    public async Task InvokeAsync(
        HttpContext context,
        ISessionGuard sessions,
        ICurrentUser currentUser
    )
    {
        var path = context.Request.Path;
        var profile = path.StartsWithSegments("/api/v1/users");
        if (currentUser.IsAuthenticated && (profile || SessionCheckedPaths.Contains(path.Value)))
        {
            var claims = new SessionClaims(
                currentUser.RequireUserId(),
                context.User.FindFirst("token_version")?.Value,
                currentUser.AccountStatus
            );
            try
            {
                // Profile endpoints also need the token's account status to still be current
                await sessions.EnsureValidAsync(
                    claims,
                    requireCurrentStatus: profile,
                    context.RequestAborted
                );
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
}
