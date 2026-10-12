using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Passwords;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Forgotten password by email link, and password change while signed in.</summary>
[ApiController, Route("api/v1/auth")]
public sealed class PasswordsController(ICurrentUser currentUser, RefreshCookie refreshCookie)
    : ControllerBase
{
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

    /// <summary>Other devices are signed out; this one gets a new session.</summary>
    [Authorize(Policy = "AuthSession"), HttpPost("change-password")]
    public async Task<IActionResult> Change(
        ChangePasswordRequest r,
        [FromServices] ICommandHandler<ChangePasswordCommand, SessionResult> handler,
        CancellationToken ct
    ) =>
        Ok(
            refreshCookie.Issue(
                Response,
                await handler.HandleAsync(
                    new(currentUser.RequireUserId(), r.CurrentPassword, r.NewPassword),
                    ct
                )
            )
        );
}
