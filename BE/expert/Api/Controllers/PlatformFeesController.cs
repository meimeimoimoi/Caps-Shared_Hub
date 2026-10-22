using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.PlatformFees;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>System Admins set the platform's percent of each catalog service; setting one opens it for pricing.</summary>
[
    ApiController,
    RequirePermission(Permission.PricingManage),
    Route("api/v1/experts/admin/platform-fees")
]
public sealed class PlatformFeesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists every active catalog service with its current platform fee.</summary>
    /// <response code="200">One row per service; percent is null until the first fee is set.</response>
    /// <response code="403">Missing the PricingManage permission.</response>
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

    /// <summary>Sets a new platform fee for a catalog service, effective now.</summary>
    /// <remarks>Cases already booked keep the percent frozen on them; only new bookings use the new rate.</remarks>
    /// <response code="200">The new rate.</response>
    /// <response code="400">PLATFORM_FEE_INVALID: outside 0 to 99.</response>
    /// <response code="403">Missing the PricingManage permission.</response>
    /// <response code="404">SERVICE_NOT_FOUND: not a catalog service.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPut("{serviceCode}"), RequireSessionCheck]
    public async Task<IActionResult> Set(
        string serviceCode,
        SetPlatformFeeRequest r,
        [FromServices] ICommandHandler<SetPlatformFeeCommand, PlatformFeeResponse> handler,
        CancellationToken ct
    )
    {
        var rate = await handler.HandleAsync(new(UserId, serviceCode, r.Percent), ct);
        return Ok(ApiResponse<PlatformFeeResponse>.Ok(rate));
    }
}
