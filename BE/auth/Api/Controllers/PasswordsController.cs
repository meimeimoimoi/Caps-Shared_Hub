using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Passwords;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Forgotten password by email link, and password change while signed in.</summary>
/// <remarks>Every POST under /api/v1/auth needs the header <c>X-Caps-Client: spa</c>.</remarks>
[ApiController, Route("api/v1/auth")]
public sealed class PasswordsController(ICurrentUser currentUser, RefreshCookie refreshCookie)
    : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Emails a password reset link if the account exists.</summary>
    /// <remarks>Always answers the same way so the response never reveals whether the email is registered.</remarks>
    /// <response code="200">Request accepted (an email is sent only for existing accounts, at most once a minute).</response>
    [AllowAnonymous, HttpPost("forgot-password")]
    public async Task<IActionResult> Forgot(
        EmailRequest r,
        [FromServices] ICommandHandler<ForgotPasswordCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(r.Email), ct);
        return Ok(ApiResponse.Message("If the account exists, an email will be sent."));
    }

    /// <summary>Sets a new password with the token from the reset link.</summary>
    /// <remarks>Signs out every device and clears any lockout; the user signs in again with the new password.</remarks>
    /// <response code="200">Password changed.</response>
    /// <response code="400">Invalid input (password shorter than 12 characters) or PASSWORD_UNCHANGED (same as the current password; the link stays usable).</response>
    /// <response code="401">INVALID_CREDENTIALS: unknown, expired or used link.</response>
    [AllowAnonymous, HttpPost("reset-password")]
    public async Task<IActionResult> Reset(
        ResetPasswordRequest r,
        [FromServices] ICommandHandler<ResetPasswordCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(r.Token, r.Password), ct);
        return Ok(ApiResponse.Message("Password reset. Sign in again."));
    }

    /// <summary>Changes the password of the signed-in user.</summary>
    /// <remarks>Other devices are signed out; this device gets a new session.</remarks>
    /// <response code="200">Password changed; new access token in the body, refresh token in the cookie.</response>
    /// <response code="400">CURRENT_PASSWORD_INVALID or PASSWORD_UNCHANGED.</response>
    /// <response code="401">Missing, expired or revoked access token.</response>
    [Authorize(Policy = "AuthSession"), HttpPost("change-password")]
    public async Task<IActionResult> Change(
        ChangePasswordRequest r,
        [FromServices] ICommandHandler<ChangePasswordCommand, SessionResult> handler,
        CancellationToken ct
    )
    {
        var command = new ChangePasswordCommand(UserId, r.CurrentPassword, r.NewPassword);
        var session = await handler.HandleAsync(command, ct);
        return Ok(refreshCookie.Issue(Response, session));
    }
}
