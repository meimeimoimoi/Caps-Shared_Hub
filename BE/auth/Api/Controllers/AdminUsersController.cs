using System.ComponentModel.DataAnnotations;
using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Users;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Accounts for the System Admin: the list, locking and unlocking, and the password reset email.</summary>
[ApiController, Route("api/v1/admin/users")]
[RequirePermission(Permission.UserManage)]
public sealed class AdminUsersController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists accounts, newest first.</summary>
    /// <remarks>
    /// search matches part of the email or the name, ignoring case. status keeps one account status
    /// (ACTIVE, PENDING_VERIFICATION or SUSPENDED). page starts at 1; pageSize defaults to 20 and is at most 100.
    /// </remarks>
    /// <response code="200">The page with the total number of matching accounts.</response>
    /// <response code="400">page or pageSize is out of range.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the UserManage permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListUsersQuery, ManagedUserPageResponse> handler,
        CancellationToken ct,
        [FromQuery, MaxLength(200)] string? search = null,
        [FromQuery, MaxLength(32)] string? status = null,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 100)] int pageSize = 20
    )
    {
        var users = await handler.HandleAsync(new(search, status, page, pageSize), ct);
        return Ok(ApiResponse<ManagedUserPageResponse>.Ok(users));
    }

    /// <summary>Locks an account so it can no longer sign in.</summary>
    /// <remarks>Every session of the account ends at once. An admin cannot lock their own account.</remarks>
    /// <response code="200">The account, now SUSPENDED.</response>
    /// <response code="400">SUSPEND_REASON_REQUIRED or invalid input.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the UserManage permission.</response>
    /// <response code="404">USER_NOT_FOUND.</response>
    /// <response code="409">USER_ALREADY_SUSPENDED.</response>
    /// <response code="422">CANNOT_SUSPEND_SELF.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/lock"), RequireSessionCheck]
    public async Task<IActionResult> Lock(
        Guid id,
        SuspendUserRequest r,
        [FromServices] ICommandHandler<SuspendUserCommand, ManagedUserResponse> handler,
        CancellationToken ct
    )
    {
        var user = await handler.HandleAsync(new(UserId, id, r.Reason), ct);
        return Ok(ApiResponse<ManagedUserResponse>.Ok(user));
    }

    /// <summary>Unlocks a locked account.</summary>
    /// <remarks>The account returns to ACTIVE, or to PENDING_VERIFICATION if its email was never verified.</remarks>
    /// <response code="200">The account with its status before the lock.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the UserManage permission.</response>
    /// <response code="404">USER_NOT_FOUND.</response>
    /// <response code="409">USER_NOT_SUSPENDED.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/unlock"), RequireSessionCheck]
    public async Task<IActionResult> Unlock(
        Guid id,
        [FromServices] ICommandHandler<ReinstateUserCommand, ManagedUserResponse> handler,
        CancellationToken ct
    )
    {
        var user = await handler.HandleAsync(new(UserId, id), ct);
        return Ok(ApiResponse<ManagedUserResponse>.Ok(user));
    }

    /// <summary>Sends the account a password reset email.</summary>
    /// <remarks>The same email as "forgot password"; the admin never sees or sets the password.</remarks>
    /// <response code="204">The email was queued.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the UserManage permission.</response>
    /// <response code="404">USER_NOT_FOUND.</response>
    /// <response code="409">USER_CANNOT_SIGN_IN: the account is locked.</response>
    /// <response code="429">EMAIL_COOLDOWN: one was sent too recently.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/password-reset"), RequireSessionCheck]
    public async Task<IActionResult> SendPasswordReset(
        Guid id,
        [FromServices] ICommandHandler<SendUserPasswordResetCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(UserId, id), ct);
        return NoContent();
    }
}
