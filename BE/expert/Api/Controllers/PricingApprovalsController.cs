using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Approvals;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// System Admin review of price changes above the auto-approval threshold (POL-MKT-02, BR-E17).
/// Prices within the threshold never reach this queue.
/// </summary>
[ApiController, RequirePermission(Permission.ExpertApprove)]
[Route("api/v1/admin/experts/pricing")]
public sealed class PricingApprovalsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists price versions in one status, oldest submission first.</summary>
    /// <param name="status">Defaults to PENDING_APPROVAL.</param>
    /// <response code="200">The queue (may be empty).</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromServices]
            IQueryHandler<
            ListPricingForReviewQuery,
            IReadOnlyList<PricingReviewItemResponse>
        > handler,
        CancellationToken ct
    )
    {
        var queue = await handler.HandleAsync(new(status), ct);
        return Ok(ApiResponse<IReadOnlyList<PricingReviewItemResponse>>.Ok(queue));
    }

    /// <summary>Approves, returns or rejects a pending price change.</summary>
    /// <remarks>APPROVE supersedes the previous price from the new effective date. RETURN_FOR_REVISION and REJECT need a note.</remarks>
    /// <response code="200">The version after the decision.</response>
    /// <response code="400">INVALID_PRICING_DECISION or PRICING_NOTE_REQUIRED.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    /// <response code="404">PRICING_VERSION_NOT_FOUND.</response>
    /// <response code="409">PRICING_NOT_PENDING.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/decision"), RequireSessionCheck]
    public async Task<IActionResult> Decide(
        Guid id,
        PricingDecisionRequest r,
        [FromServices] ICommandHandler<DecidePricingCommand, ServicePricingResponse> handler,
        CancellationToken ct
    )
    {
        var version = await handler.HandleAsync(r.ToCommand(UserId, id), ct);
        return Ok(ApiResponse<ServicePricingResponse>.Ok(version));
    }
}
