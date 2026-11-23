using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.EmailVerification;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Email verification by link or 6-digit code, and resending the email.</summary>
/// <remarks>Every POST under /api/v1/auth needs the header <c>X-Caps-Client: spa</c>.</remarks>
[ApiController, Route("api/v1/auth")]
public sealed class EmailVerificationController(
    ICurrentUser currentUser,
    RefreshCookie refreshCookie
) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Verifies the email with the token from the link (works without signing in).</summary>
    /// <remarks>Using the link also voids the 6-digit code from the same email. Existing sessions stay restricted until refreshed.</remarks>
    /// <response code="200">Email verified; the account is now ACTIVE.</response>
    /// <response code="401">INVALID_CREDENTIALS: unknown, expired or used link, or the account is already verified.</response>
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

    /// <summary>Verifies the email with the 6-digit code and returns a new ACTIVE session.</summary>
    /// <remarks>The code expires after 10 minutes and allows 5 wrong attempts. Using it also voids the link.</remarks>
    /// <response code="200">Email verified; new access token in the body, refresh token in the cookie.</response>
    /// <response code="400">CODE_EXPIRED, or CODE_INVALID with the attempts left in the message.</response>
    /// <response code="409">ALREADY_VERIFIED.</response>
    /// <response code="429">CODE_LOCKED: too many wrong codes; request a new email.</response>
    [Authorize(Policy = "AuthSession"), HttpPost("verify-email-code")]
    public async Task<IActionResult> VerifyCode(
        VerifyEmailCodeRequest r,
        [FromServices] ICommandHandler<VerifyEmailCodeCommand, SessionResult> handler,
        CancellationToken ct
    )
    {
        var session = await handler.HandleAsync(new(UserId, r.Code), ct);
        return Ok(refreshCookie.Issue(Response, session));
    }

    /// <summary>Sends a new verification email (new link and code; the previous ones stop working).</summary>
    /// <response code="200">Email queued.</response>
    /// <response code="409">ALREADY_VERIFIED.</response>
    /// <response code="429">EMAIL_COOLDOWN: wait 60 seconds between emails.</response>
    [Authorize(Policy = "AuthSession"), HttpPost("resend-verification")]
    public async Task<IActionResult> Resend(
        [FromServices] ICommandHandler<ResendVerificationCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse.Message("Verification requested."));
    }
}
