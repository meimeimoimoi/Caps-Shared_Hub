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
    private const string Path = "/api/v1/auth";

    public string? Read(HttpRequest request) => request.Cookies[Name];

    public void Write(HttpResponse response, string token, DateTimeOffset expires) =>
        response.Cookies.Append(
            Name,
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

    public void Clear(HttpResponse response) =>
        response.Cookies.Delete(
            Name,
            new CookieOptions
            {
                Path = Path,
                Secure = options.Value.SecureCookie,
                SameSite = SameSiteMode.Strict,
            }
        );
}
