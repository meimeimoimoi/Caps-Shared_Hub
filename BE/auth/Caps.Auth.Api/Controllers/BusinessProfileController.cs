using Caps.Auth.Api.DTOs.Requests;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Profile;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Company details of an active customer account (USER role).</summary>
[ApiController, Authorize(Policy = "ActiveAccount"), Route("api/v1/users/me/business-profile")]
public sealed class BusinessProfileController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>data = null when no profile has been saved yet.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetBusinessProfileQuery, BusinessResponse?> handler,
        CancellationToken ct
    ) => Ok(ApiResponse<BusinessResponse?>.Ok(await handler.HandleAsync(new(UserId), ct)));

    [HttpPut]
    public async Task<IActionResult> Update(
        BusinessProfileRequest r,
        [FromServices] ICommandHandler<UpdateBusinessProfileCommand, BusinessResponse> handler,
        CancellationToken ct
    ) => Ok(ApiResponse<BusinessResponse>.Ok(await handler.HandleAsync(r.ToCommand(UserId), ct)));
}
