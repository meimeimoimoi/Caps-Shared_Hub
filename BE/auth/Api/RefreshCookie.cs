using Caps.Auth.Application.DTOs.Responses;
using Caps.Common.Api;
using Microsoft.Extensions.Options;

namespace Caps.Auth.Api;

/// <summary>Bound from the "Auth" section, next to the other auth settings.</summary>
public sealed class RefreshCookieOptions
{
    /// <summary>Only false for local HTTP in Development.</summary>
    public bool SecureCookie { get; set; } = true;
}

/// <summary>HttpOnly refresh-token cookie, scoped to the auth endpoints only.</summary>
public sealed class RefreshCookie(IOptions<RefreshCookieOptions> options)
{
    private const string Name = "caps_refresh";
    private const string PersistenceName = "caps_session_persistence";
    private const string Path = "/api/v1/auth";

    public string? Read(HttpRequest request) => request.Cookies[Name];

    /// <summary>Stores the refresh token in the cookie and returns the body with the access token.</summary>
    public ApiResponse<AuthResponse> Issue(
        HttpResponse response,
        SessionResult session,
        bool? rememberMe = null
    )
    {
        // Preserve the browser lifetime when refreshing or replacing an existing session.
        // Older sessions without the preference cookie retain their existing persistent behavior.
        var persistent =
            rememberMe ?? response.HttpContext.Request.Cookies[PersistenceName] != "session";
        DateTimeOffset? expires = persistent ? session.RefreshExpiresAt : null;
        Write(response, Name, session.RefreshToken, expires);
        Write(response, PersistenceName, persistent ? "persistent" : "session", expires);
        return ApiResponse<AuthResponse>.Ok(session.Response);
    }

    private void Write(HttpResponse response, string name, string token, DateTimeOffset? expires) =>
        response.Cookies.Append(
            name,
            token,
            new CookieOptions
            {
                HttpOnly = true,
                Secure = options.Value.SecureCookie,
                SameSite = SameSiteMode.Strict,
                Path = Path,
                Expires = expires,
            }
        );

    public void Clear(HttpResponse response)
    {
        Delete(response, Name);
        Delete(response, PersistenceName);
    }

    private void Delete(HttpResponse response, string name) =>
        response.Cookies.Delete(
            name,
            new CookieOptions
            {
                Path = Path,
                Secure = options.Value.SecureCookie,
                SameSite = SameSiteMode.Strict,
            }
        );
}
