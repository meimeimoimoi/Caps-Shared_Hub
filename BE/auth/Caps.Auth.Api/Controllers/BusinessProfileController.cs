using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Profile;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Company details of an active customer account (USER role).</summary>
[ApiController, Route("api/v1/users/me/business-profile")]
public sealed class BusinessProfileController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Returns the company details of the signed-in customer.</summary>
    /// <response code="200">Company details, or data = null when none were saved yet.</response>
    /// <response code="403">The account is not active or lacks the USER role (USER_ROLE_REQUIRED).</response>
    [RequirePermission(Permission.BusinessRead), HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetBusinessProfileQuery, BusinessResponse?> handler,
        CancellationToken ct
    )
    {
        var profile = await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<BusinessResponse?>.Ok(profile));
    }

    /// <summary>Creates or updates the company details (one per account).</summary>
    /// <remarks>The tax code has 10 digits, optionally followed by a 3-digit branch suffix.</remarks>
    /// <response code="200">Saved company details.</response>
    /// <response code="400">Invalid input.</response>
    /// <response code="403">The account is not active or lacks the USER role (USER_ROLE_REQUIRED).</response>
    [RequirePermission(Permission.BusinessWrite), HttpPut]
    public async Task<IActionResult> Update(
        BusinessProfileRequest r,
        [FromServices] ICommandHandler<UpdateBusinessProfileCommand, BusinessResponse> handler,
        CancellationToken ct
    )
    {
        var profile = await handler.HandleAsync(r.ToCommand(UserId), ct);
        return Ok(ApiResponse<BusinessResponse>.Ok(profile));
    }
}
