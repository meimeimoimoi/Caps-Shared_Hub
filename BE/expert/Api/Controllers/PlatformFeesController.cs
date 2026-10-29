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

    /// <summary>Lists every active catalog service with its platform fee and any pending change.</summary>
    /// <response code="200">
    /// One row per service; percent is null until the first fee is set, pending is the announced change.
    /// </response>
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

    /// <summary>Announces a new platform fee for a catalog service from effectiveOn.</summary>
    /// <remarks>
    /// A change, raise or cut, must start at least the PlatformFeeNoticeDays policy ahead and replaces a change
    /// still pending. The first fee of a service applies at once. Cases already booked keep their percent.
    /// </remarks>
    /// <response code="200">The service row with the rate in force and the pending change.</response>
    /// <response code="400">PLATFORM_FEE_INVALID: outside 0 to 50; PLATFORM_FEE_TOO_SOON: before the earliest day.
    /// LATE_RULE_INVALID: the late hours or penalty are out of range.</response>
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
        var rate = await handler.HandleAsync(
            new(
                UserId,
                serviceCode,
                r.Percent,
                r.LatePenaltyHours,
                r.LatePenaltyPercent,
                r.LateCancelHours,
                r.NoResponseHours,
                r.NoResponseRefundPercent,
                r.NoResponseExpertPercent,
                r.EffectiveOn
            ),
            ct
        );
        return Ok(ApiResponse<PlatformFeeResponse>.Ok(rate));
    }

    /// <summary>Cancels the pending platform fee change of a catalog service.</summary>
    /// <remarks>The rate in force stays; the cancelled change is kept as history.</remarks>
    /// <response code="200">The service row without the pending change.</response>
    /// <response code="403">Missing the PricingManage permission.</response>
    /// <response code="404">SERVICE_NOT_FOUND: not a catalog service.</response>
    /// <response code="409">PLATFORM_FEE_NOT_PENDING: nothing pending to cancel.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpDelete("{serviceCode}/pending"), RequireSessionCheck]
    public async Task<IActionResult> CancelPending(
        string serviceCode,
        [FromServices] ICommandHandler<CancelPlatformFeeCommand, PlatformFeeResponse> handler,
        CancellationToken ct
    )
    {
        var rate = await handler.HandleAsync(new(UserId, serviceCode), ct);
        return Ok(ApiResponse<PlatformFeeResponse>.Ok(rate));
    }
}
