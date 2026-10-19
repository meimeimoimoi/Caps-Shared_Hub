using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Services;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>The signed-in expert's service packages: price, delivery time and what the expert receives.</summary>
[ApiController, RequirePermission(Permission.ServiceManage), Route("api/v1/experts/me/services")]
public sealed class ServicesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists the expert's packages with the current platform fee and net amount.</summary>
    /// <response code="200">The expert's packages.</response>
    /// <response code="403">Missing ServiceManage permission, or NOT_APPROVED_FOR_SERVICE.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListMyServiceQuery, IReadOnlyList<MyServiceResponse>> handler,
        CancellationToken ct
    )
    {
        var services = await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<IReadOnlyList<MyServiceResponse>>.Ok(services));
    }

    /// <summary>Sets the price and delivery time of one service; returns what the expert receives.</summary>
    /// <remarks>netAmount = fee × (100 − platformFeePercent) / 100, rounded down. Booked cases keep their old price.</remarks>
    /// <response code="200">The saved package with the platform fee and net amount.</response>
    /// <response code="400">FEE_INVALID, TURNAROUND_INVALID or SERVICE_TYPE_INVALID.</response>
    /// <response code="403">Missing ServiceManage permission, or NOT_APPROVED_FOR_SERVICE.</response>
    /// <response code="404">SERVICE_TYPE_UNKNOWN: the administrator has not opened this service.</response>
    /// <response code="409">OFFERING_CONFLICT: saved twice at the same time.</response>
    [HttpPut("{serviceType}"), RequireSessionCheck]
    public async Task<IActionResult> Set(
        string serviceType,
        SetServiceRequest r,
        [FromServices] ICommandHandler<SetMyServiceCommand, MyServiceResponse> handler,
        CancellationToken ct
    )
    {
        var service = await handler.HandleAsync(
            new(UserId, serviceType, r.Fee, r.TurnaroundHours),
            ct
        );
        return Ok(ApiResponse<MyServiceResponse>.Ok(service));
    }
}
