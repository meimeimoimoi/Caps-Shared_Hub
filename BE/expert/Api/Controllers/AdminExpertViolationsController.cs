using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Violations;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>Violation points of one expert, for the System Admin's expert management page.</summary>
[ApiController, RequirePermission(Permission.ExpertApprove)]
[Route("api/v1/admin/experts/{profileId:guid}/violations")]
public sealed class AdminExpertViolationsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists the expert's violations, newest first, with the points that count now.</summary>
    /// <remarks>
    /// Late +1, withdrew +2, never delivered +3. Points count for 90 days; 6 hide the expert from the
    /// Marketplace, 9 suspend every approved service. ExcusesLeft: excuses still allowed in the window.
    /// </remarks>
    /// <response code="200">The points and the violations (may be empty).</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        Guid profileId,
        [FromServices] IQueryHandler<ListViolationsQuery, ExpertViolationsResponse> handler,
        CancellationToken ct
    )
    {
        var violations = await handler.HandleAsync(new(profileId), ct);
        return Ok(ApiResponse<ExpertViolationsResponse>.Ok(violations));
    }

    /// <summary>Excuses one violation for force majeure; it stops counting.</summary>
    /// <remarks>
    /// Reason required. At most 2 excuses per expert in 90 days. The money split of the case does not change,
    /// and a service already suspended stays suspended until an admin reinstates it.
    /// </remarks>
    /// <response code="200">The expert's violations after the change.</response>
    /// <response code="400">VIOLATION_EXCUSE_REASON_REQUIRED.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    /// <response code="404">VIOLATION_NOT_FOUND.</response>
    /// <response code="409">VIOLATION_ALREADY_EXCUSED or VIOLATION_EXCUSE_LIMIT.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{reviewCaseId:guid}/excuse"), RequireSessionCheck]
    public async Task<IActionResult> Excuse(
        Guid profileId,
        Guid reviewCaseId,
        ExcuseViolationRequest r,
        [FromServices] ICommandHandler<ExcuseViolationCommand> excuse,
        [FromServices] IQueryHandler<ListViolationsQuery, ExpertViolationsResponse> list,
        CancellationToken ct
    )
    {
        await excuse.HandleAsync(r.ToCommand(UserId, profileId, reviewCaseId), ct);
        var violations = await list.HandleAsync(new(profileId), ct);
        return Ok(ApiResponse<ExpertViolationsResponse>.Ok(violations));
    }
}
