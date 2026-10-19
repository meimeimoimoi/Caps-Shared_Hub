using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.PlatformFees;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>Administrators set the platform's percent of each service; setting one opens the service for pricing.</summary>
[
    ApiController,
    RequirePermission(Permission.PricingManage),
    Route("api/v1/experts/admin/platform-fees")
]
public sealed class PlatformFeesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists every service open for pricing with its current platform fee.</summary>
    /// <response code="200">Current rates.</response>
    /// <response code="403">Missing PricingManage permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices]
            IQueryHandler<ListPlatformFeesQuery, IReadOnlyList<PlatformFeeResponse>> handler,
        CancellationToken ct
    )
    {
        var rates = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<IReadOnlyList<PlatformFeeResponse>>.Ok(rates));
    }

    /// <summary>Sets a new platform fee for a service, effective now.</summary>
    /// <remarks>Cases already booked keep the percent frozen on them; only new bookings use the new rate.</remarks>
    /// <response code="200">The new rate.</response>
    /// <response code="400">PLATFORM_FEE_INVALID or SERVICE_TYPE_INVALID.</response>
    /// <response code="403">Missing PricingManage permission.</response>
    [HttpPut("{serviceType}"), RequireSessionCheck]
    public async Task<IActionResult> Set(
        string serviceType,
        SetPlatformFeeRequest r,
        [FromServices] ICommandHandler<SetPlatformFeeCommand, PlatformFeeResponse> handler,
        CancellationToken ct
    )
    {
        var rate = await handler.HandleAsync(new(UserId, serviceType, r.Percent), ct);
        return Ok(ApiResponse<PlatformFeeResponse>.Ok(rate));
    }
}
