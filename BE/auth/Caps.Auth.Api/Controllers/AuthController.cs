using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.EmailVerification;
using Caps.Auth.Application.Features.Passwords;
using Caps.Auth.Application.Features.Sessions;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>
/// HTTP adapter only: maps requests to commands and sessions to the refresh cookie.
/// Each action receives just the handler it needs.
/// </summary>
[ApiController, Route("api/v1/auth")]
public sealed class AuthController(ICurrentUser currentUser, RefreshCookie refreshCookie)
    : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    private object Session(SessionResult session)
    {
        refreshCookie.Write(Response, session.RefreshToken, session.RefreshExpiresAt);
        return ApiResponse<AuthResponse>.Ok(session.Response);
    }

    [AllowAnonymous, HttpPost("register")]
    public async Task<IActionResult> Register(
        RegisterRequest r,
        [FromServices] ICommandHandler<RegisterCommand, SessionResult> handler,
        CancellationToken ct
    ) => Ok(Session(await handler.HandleAsync(new(r.Email, r.Password, r.DisplayName), ct)));

    [AllowAnonymous, HttpPost("login")]
    public async Task<IActionResult> Login(
        LoginRequest r,
        [FromServices] ICommandHandler<LoginCommand, SessionResult> handler,
        CancellationToken ct
    ) => Ok(Session(await handler.HandleAsync(new(r.Email, r.Password), ct)));

    [AllowAnonymous, HttpPost("refresh-token")]
    public async Task<IActionResult> Refresh(
        [FromServices] ICommandHandler<RefreshSessionCommand, SessionResult> handler,
        CancellationToken ct
    )
    {
        var token =
            refreshCookie.Read(Request)
            ?? throw CommonErrors.RefreshRequired("Refresh cookie required.");
        return Ok(Session(await handler.HandleAsync(new(token), ct)));
    }

    [Authorize(Policy = "AuthSession"), HttpPost("logout")]
    public async Task<IActionResult> Logout(
        [FromServices] ICommandHandler<LogoutCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(UserId, refreshCookie.Read(Request)), ct);
        refreshCookie.Clear(Response);
        return Ok(ApiResponse<object>.Ok(new { }, "Logged out."));
    }

    [AllowAnonymous, HttpPost("verify-email")]
    public async Task<IActionResult> Verify(
        TokenRequest r,
        [FromServices] ICommandHandler<VerifyEmailCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(r.Token), ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Email verified. Refresh or sign in again."));
    }

    /// <summary>Verify with the 6-digit code from the email; returns a new active session.</summary>
    [Authorize(Policy = "AuthSession"), HttpPost("verify-email-code")]
    public async Task<IActionResult> VerifyCode(
        VerifyEmailCodeRequest r,
        [FromServices] ICommandHandler<VerifyEmailCodeCommand, SessionResult> handler,
        CancellationToken ct
    ) => Ok(Session(await handler.HandleAsync(new(UserId, r.Code), ct)));

    [Authorize(Policy = "AuthSession"), HttpPost("resend-verification")]
    public async Task<IActionResult> Resend(
        [FromServices] ICommandHandler<ResendVerificationCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Verification requested."));
    }

    [AllowAnonymous, HttpPost("forgot-password")]
    public async Task<IActionResult> Forgot(
        EmailRequest r,
        [FromServices] ICommandHandler<ForgotPasswordCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(r.Email), ct);
        return Ok(ApiResponse<object>.Ok(new { }, "If the account exists, an email will be sent."));
    }

    [Authorize(Policy = "AuthSession"), HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(
        ChangePasswordRequest r,
        [FromServices] ICommandHandler<ChangePasswordCommand, SessionResult> handler,
        CancellationToken ct
    ) => Ok(Session(await handler.HandleAsync(new(UserId, r.CurrentPassword, r.NewPassword), ct)));

    [AllowAnonymous, HttpPost("reset-password")]
    public async Task<IActionResult> Reset(
        ResetPasswordRequest r,
        [FromServices] ICommandHandler<ResetPasswordCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(r.Token, r.Password), ct);
        return Ok(ApiResponse<object>.Ok(new { }, "Password reset. Sign in again."));
    }
}
