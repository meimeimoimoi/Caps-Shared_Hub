using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Services;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>The signed-in expert's own prices: price, delivery time and what the expert receives.</summary>
[ApiController, RequirePermission(Permission.ServiceManage), Route("api/v1/experts/me/services")]
public sealed class ServicesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists every service open for pricing with its platform fee and the expert's price.</summary>
    /// <remarks>Fee, turnaroundHours and netAmount are null for services the expert has not priced yet.</remarks>
    /// <response code="200">One row per service that has a platform fee.</response>
    /// <response code="403">Missing the ServiceManage permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListMyServicesQuery, IReadOnlyList<MyServiceResponse>> handler,
        CancellationToken ct
    )
    {
        var services = await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<IReadOnlyList<MyServiceResponse>>.Ok(services));
    }

    /// <summary>Sets the price and delivery time of one service; returns what the expert receives.</summary>
    /// <remarks>
    /// The expert must be approved for the service (Gate 2) and the System Admin must have set its platform
    /// fee. netAmount = fee × (100 − platformFeePercent) / 100, rounded down. Booked cases keep their price.
    /// </remarks>
    /// <response code="200">The saved price with the platform fee and net amount.</response>
    /// <response code="400">FEE_INVALID or TURNAROUND_INVALID.</response>
    /// <response code="403">Missing the ServiceManage permission, or PRICING_NOT_ALLOWED: not approved for this service.</response>
    /// <response code="409">OFFERING_CONFLICT: saved twice at the same time.</response>
    /// <response code="422">PLATFORM_FEE_NOT_SET: the service is not open for pricing yet.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPut("{serviceCode}"), RequireSessionCheck]
    public async Task<IActionResult> Set(
        string serviceCode,
        SetServiceRequest r,
        [FromServices] ICommandHandler<SetMyServiceCommand, MyServiceResponse> handler,
        CancellationToken ct
    )
    {
        var service = await handler.HandleAsync(
            new(UserId, serviceCode, r.Fee, r.TurnaroundHours),
            ct
        );
        return Ok(ApiResponse<MyServiceResponse>.Ok(service));
    }
}
