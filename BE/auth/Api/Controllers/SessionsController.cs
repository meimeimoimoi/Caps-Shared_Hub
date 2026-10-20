using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Sessions;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Sign-up, sign-in and the refresh-cookie session lifecycle.</summary>
/// <remarks>
/// Every POST under /api/v1/auth needs the header <c>X-Caps-Client: spa</c> (403 CLIENT_HEADER_REQUIRED otherwise).
/// A session response carries the access token in the body and sets the HttpOnly <c>caps_refresh</c> cookie.
/// </remarks>
[ApiController, Route("api/v1/auth")]
public sealed class SessionsController(ICurrentUser currentUser, RefreshCookie refreshCookie)
    : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Creates an account and signs it in with a restricted (pending verification) session.</summary>
    /// <remarks>Also emails a verification link plus a 6-digit code. Disposable or undeliverable emails are rejected.</remarks>
    /// <response code="200">Account created; access token in the body, refresh token in the cookie.</response>
    /// <response code="400">Invalid input, EMAIL_DISPOSABLE or EMAIL_DOMAIN_INVALID.</response>
    /// <response code="409">EMAIL_EXISTS.</response>
    /// <response code="429">Too many requests from this IP.</response>
    [AllowAnonymous, HttpPost("register")]
    public async Task<IActionResult> Register(
        RegisterRequest r,
        [FromServices] ICommandHandler<RegisterCommand, SessionResult> handler,
        CancellationToken ct
    )
    {
        var session = await handler.HandleAsync(new(r.Email, r.Password, r.DisplayName), ct);
        return Ok(refreshCookie.Issue(Response, session));
    }

    /// <summary>Signs in with email and password.</summary>
    /// <remarks>
    /// Five wrong passwords lock the account for 15 minutes. Unknown email, wrong password and lockout all return the same error.
    /// RememberMe keeps the refresh cookie across browser restarts; otherwise a session cookie is issued.
    /// </remarks>
    /// <response code="200">Signed in; access token in the body, refresh token in the cookie.</response>
    /// <response code="401">INVALID_CREDENTIALS.</response>
    /// <response code="429">Too many requests from this IP.</response>
    [AllowAnonymous, HttpPost("login")]
    public async Task<IActionResult> Login(
        LoginRequest r,
        [FromServices] ICommandHandler<LoginCommand, SessionResult> handler,
        CancellationToken ct
    )
    {
        var session = await handler.HandleAsync(new(r.Email, r.Password), ct);
        return Ok(refreshCookie.Issue(Response, session, r.RememberMe));
    }

    /// <summary>Signs in with a Google ID token, creating the account on first use.</summary>
    /// <remarks>
    /// An existing account with the same verified email is linked to the Google account (and verified if it was pending).
    /// New accounts are active immediately and have no password until one is set through forgot-password.
    /// </remarks>
    /// <response code="200">Signed in; access token in the body, refresh token in the cookie.</response>
    /// <response code="400">Invalid input or GOOGLE_EMAIL_UNVERIFIED.</response>
    /// <response code="401">INVALID_CREDENTIALS (invalid or expired Google token, or a blocked account).</response>
    /// <response code="429">Too many requests from this IP.</response>
    /// <response code="503">GOOGLE_LOGIN_UNAVAILABLE (not configured, or Google's keys cannot be downloaded).</response>
    [AllowAnonymous, HttpPost("google")]
    public async Task<IActionResult> Google(
        GoogleLoginRequest r,
        [FromServices] ICommandHandler<GoogleLoginCommand, SessionResult> handler,
        CancellationToken ct
    )
    {
        var session = await handler.HandleAsync(new(r.IdToken), ct);
        return Ok(refreshCookie.Issue(Response, session));
    }

    /// <summary>Exchanges the refresh cookie for a new access token and rotates the cookie.</summary>
    /// <remarks>Reusing an already rotated refresh token is treated as theft and signs out every device.</remarks>
    /// <response code="200">New session; the old refresh token can no longer be used.</response>
    /// <response code="401">REFRESH_REQUIRED (no cookie) or INVALID_CREDENTIALS (expired, revoked or reused token).</response>
    [AllowAnonymous, HttpPost("refresh-token")]
    public async Task<IActionResult> Refresh(
        [FromServices] ICommandHandler<RefreshSessionCommand, SessionResult> handler,
        CancellationToken ct
    )
    {
        var token =
            refreshCookie.Read(Request)
            ?? throw CommonErrors.RefreshRequired("Refresh cookie required.");
        var session = await handler.HandleAsync(new(token), ct);
        return Ok(refreshCookie.Issue(Response, session));
    }

    /// <summary>Signs out this device: revokes its refresh token and access token, and clears the cookie.</summary>
    /// <remarks>Every service rejects the access token from now on, not only when it expires.</remarks>
    /// <response code="200">Signed out. Other devices stay signed in.</response>
    /// <response code="401">Missing, expired or revoked access token.</response>
    [Authorize(Policy = "AuthSession"), HttpPost("logout")]
    public async Task<IActionResult> Logout(
        [FromServices] ICommandHandler<LogoutCommand> handler,
        CancellationToken ct
    )
    {
        var command = new LogoutCommand(
            UserId,
            refreshCookie.Read(Request),
            currentUser.TokenId,
            currentUser.TokenExpiresAt
        );
        await handler.HandleAsync(command, ct);
        refreshCookie.Clear(Response);
        return Ok(ApiResponse.Message("Logged out."));
    }
}
