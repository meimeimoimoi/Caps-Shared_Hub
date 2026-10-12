using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Sessions;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Sign-up, sign-in and the refresh-cookie session lifecycle.</summary>
[ApiController, Route("api/v1/auth")]
public sealed class SessionsController(ICurrentUser currentUser, RefreshCookie refreshCookie)
    : ControllerBase
{
    [AllowAnonymous, HttpPost("register")]
    public async Task<IActionResult> Register(
        RegisterRequest r,
        [FromServices] ICommandHandler<RegisterCommand, SessionResult> handler,
        CancellationToken ct
    ) =>
        Ok(
            refreshCookie.Issue(
                Response,
                await handler.HandleAsync(new(r.Email, r.Password, r.DisplayName), ct)
            )
        );

    [AllowAnonymous, HttpPost("login")]
    public async Task<IActionResult> Login(
        LoginRequest r,
        [FromServices] ICommandHandler<LoginCommand, SessionResult> handler,
        CancellationToken ct
    ) => Ok(refreshCookie.Issue(Response, await handler.HandleAsync(new(r.Email, r.Password), ct)));

    [AllowAnonymous, HttpPost("refresh-token")]
    public async Task<IActionResult> Refresh(
        [FromServices] ICommandHandler<RefreshSessionCommand, SessionResult> handler,
        CancellationToken ct
    )
    {
        var token =
            refreshCookie.Read(Request)
            ?? throw CommonErrors.RefreshRequired("Refresh cookie required.");
        return Ok(refreshCookie.Issue(Response, await handler.HandleAsync(new(token), ct)));
    }

    [Authorize(Policy = "AuthSession"), HttpPost("logout")]
    public async Task<IActionResult> Logout(
        [FromServices] ICommandHandler<LogoutCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(
            new(currentUser.RequireUserId(), refreshCookie.Read(Request)),
            ct
        );
        refreshCookie.Clear(Response);
        return Ok(ApiResponse.Message("Logged out."));
    }
}
