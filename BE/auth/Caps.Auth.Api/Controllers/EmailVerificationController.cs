using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.EmailVerification;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Email verification by link or 6-digit code, and resending the email.</summary>
[ApiController, Route("api/v1/auth")]
public sealed class EmailVerificationController(
    ICurrentUser currentUser,
    RefreshCookie refreshCookie
) : ControllerBase
{
    [AllowAnonymous, HttpPost("verify-email")]
    public async Task<IActionResult> Verify(
        TokenRequest r,
        [FromServices] ICommandHandler<VerifyEmailCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(r.Token), ct);
        return Ok(ApiResponse.Message("Email verified. Refresh or sign in again."));
    }

    /// <summary>Returns a new active session, so the user continues without signing in again.</summary>
    [Authorize(Policy = "AuthSession"), HttpPost("verify-email-code")]
    public async Task<IActionResult> VerifyCode(
        VerifyEmailCodeRequest r,
        [FromServices] ICommandHandler<VerifyEmailCodeCommand, SessionResult> handler,
        CancellationToken ct
    ) =>
        Ok(
            refreshCookie.Issue(
                Response,
                await handler.HandleAsync(new(currentUser.RequireUserId(), r.Code), ct)
            )
        );

    [Authorize(Policy = "AuthSession"), HttpPost("resend-verification")]
    public async Task<IActionResult> Resend(
        [FromServices] ICommandHandler<ResendVerificationCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(currentUser.RequireUserId()), ct);
        return Ok(ApiResponse.Message("Verification requested."));
    }
}
