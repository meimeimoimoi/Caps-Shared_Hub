using System.Security.Claims;
using auth.DTOs.Requests;
using auth.Services;
using auth.Services.Interface;
using Caps.Common.Wrappers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace auth.Controllers;
[ApiController, Route("api/v1/auth")]
public sealed class AuthController(IAuthService auth, IOptions<AuthOptions> options) : ControllerBase
{
    private const string CookieName = "caps_refresh";
    private Guid UserId => Guid.Parse(User.FindFirstValue("sub")!);
    private void Cookie(string token, DateTimeOffset expires) => Response.Cookies.Append(CookieName, token, new CookieOptions { HttpOnly = true, Secure = options.Value.SecureCookie, SameSite = SameSiteMode.Strict, Path = "/api/v1/auth", Expires = expires });
    private object Session(auth.DTOs.Responses.SessionResult session) { Cookie(session.RefreshToken, session.RefreshExpiresAt); return ApiResponse<auth.DTOs.Responses.AuthResponse>.Ok(session.Response); }
    [AllowAnonymous, HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest r, CancellationToken ct) => Ok(Session(await auth.RegisterAsync(r, ct)));
    [AllowAnonymous, HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest r, CancellationToken ct) => Ok(Session(await auth.LoginAsync(r, ct)));
    [AllowAnonymous, HttpPost("refresh-token")]
    public async Task<IActionResult> Refresh(CancellationToken ct) => Ok(Session(await auth.RefreshAsync(Request.Cookies[CookieName] ?? throw new AuthFailure(401, "REFRESH_REQUIRED", "Refresh cookie required."), ct)));
    [Authorize(Policy = "AuthSession"), HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        await auth.LogoutAsync(UserId, Request.Cookies[CookieName], ct);
        Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/api/v1/auth", Secure = options.Value.SecureCookie, SameSite = SameSiteMode.Strict });
        return Ok(ApiResponse<object>.Ok(new { }, "Logged out."));
    }
    [AllowAnonymous, HttpPost("verify-email")]
    public async Task<IActionResult> Verify(TokenRequest r, CancellationToken ct) { await auth.VerifyAsync(r.Token, ct); return Ok(ApiResponse<object>.Ok(new { }, "Email verified. Refresh or sign in again.")); }
    [Authorize(Policy = "AuthSession"), HttpPost("resend-verification")]
    public async Task<IActionResult> Resend(CancellationToken ct) { await auth.ResendAsync(UserId, ct); return Ok(ApiResponse<object>.Ok(new { }, "Verification requested.")); }
    [AllowAnonymous, HttpPost("forgot-password")]
    public async Task<IActionResult> Forgot(EmailRequest r, CancellationToken ct) { await auth.ForgotAsync(r.Email, ct); return Ok(ApiResponse<object>.Ok(new { }, "If the account exists, an email will be sent.")); }
    [AllowAnonymous, HttpPost("reset-password")]
    public async Task<IActionResult> Reset(ResetPasswordRequest r, CancellationToken ct) { await auth.ResetAsync(r, ct); return Ok(ApiResponse<object>.Ok(new { }, "Password reset. Sign in again.")); }
}
