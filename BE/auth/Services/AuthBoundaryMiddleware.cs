using auth.Data;
using Caps.Common.Wrappers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
namespace auth.Services;
public sealed class AuthBoundaryMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, AuthDbContext db, IOptions<AuthOptions> options, IConfiguration config)
    {
        try
        {
            if (context.Request.Method != "GET" && context.Request.Path.StartsWithSegments("/api/v1/auth"))
            {
                // Yêu cầu explicit header chống form POST/CSRF; cross-origin JS phải qua CORS preflight.
                if (context.Request.Headers["X-Caps-Client"] != "spa") throw new AuthFailure(403, "CLIENT_HEADER_REQUIRED", "X-Caps-Client: spa is required.");
                var origin = context.Request.Headers.Origin.ToString();
                var allowed = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
                if (origin.Length > 0 && !allowed.Contains(origin, StringComparer.OrdinalIgnoreCase)) throw new AuthFailure(403, "ORIGIN_REJECTED", "Origin is not allowed.");
            }
            if (context.User.Identity?.IsAuthenticated == true && (context.Request.Path.StartsWithSegments("/api/v1/users") || context.Request.Path == "/api/v1/auth/logout" || context.Request.Path == "/api/v1/auth/resend-verification"))
            {
                if (!Guid.TryParse(context.User.FindFirst("sub")?.Value, out var id)) throw new AuthFailure(401, "INVALID_SESSION", "Invalid session.");
                var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(x => x.Id == id, context.RequestAborted);
                if (user == null || (user.Status != "ACTIVE" && user.Status != "PENDING_VERIFICATION") || context.User.FindFirst("token_version")?.Value != user.TokenVersion.ToString())
                    throw new AuthFailure(401, "INVALID_SESSION", "Session revoked.");
            }
            // CURRENT role/status bị đổi phải lấy lại token, không dùng claim stale.
            if (context.User.Identity?.IsAuthenticated == true && context.Request.Path.StartsWithSegments("/api/v1/users"))
            {
                var currentId = Guid.Parse(context.User.FindFirst("sub")!.Value);
                var account = await db.Users.AsNoTracking().SingleAsync(x => x.Id == currentId, context.RequestAborted);
                if (context.User.FindFirst("account_status")?.Value != account.Status) throw new AuthFailure(401, "REFRESH_REQUIRED", "Refresh the session after account status changes.");
            }
            await next(context);
        }
        catch (AuthFailure e)
        {
            context.Response.StatusCode = e.Status;
            await context.Response.WriteAsJsonAsync(new { success = false, data = (object?)null, message = e.Message, code = e.Code }, context.RequestAborted);
        }
    }
}
