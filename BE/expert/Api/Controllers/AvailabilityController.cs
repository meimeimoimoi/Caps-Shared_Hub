using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Availability;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>The signed-in expert's switch for taking new cases and their capacity.</summary>
[
    ApiController,
    RequirePermission(Permission.ServiceManage),
    Route("api/v1/experts/me/availability")
]
public sealed class AvailabilityController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Takes new cases or pauses, and sets how many cases run at once.</summary>
    /// <remarks>Pausing hides the expert from the marketplace; running cases continue.</remarks>
    /// <response code="200">The saved availability.</response>
    /// <response code="400">CAPACITY_INVALID.</response>
    /// <response code="403">Missing ServiceManage permission, or NOT_APPROVED_FOR_SERVICE.</response>
    [HttpPut]
    public async Task<IActionResult> Set(
        SetAvailabilityRequest r,
        [FromServices] ICommandHandler<SetAvailabilityCommand, AvailabilityResponse> handler,
        CancellationToken ct
    )
    {
        var availability = await handler.HandleAsync(new(UserId, r.Accepting, r.Capacity), ct);
        return Ok(ApiResponse<AvailabilityResponse>.Ok(availability));
    }
}
