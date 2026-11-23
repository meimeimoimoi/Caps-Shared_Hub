using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Violations;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>Excuse requests from experts, for the System Admin's queue page.</summary>
[ApiController, RequirePermission(Permission.ExpertApprove)]
[Route("api/v1/admin/experts/excuse-requests")]
public sealed class AdminExcuseRequestsController : ControllerBase
{
    /// <summary>Lists the excuse requests waiting for a decision, oldest first.</summary>
    /// <remarks>Excuse or decline one through /api/v1/admin/experts/{profileId}/violations/{reviewCaseId}.</remarks>
    /// <response code="200">The requests (may be empty).</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices]
            IQueryHandler<ListExcuseRequestsQuery, IReadOnlyList<ExcuseRequestResponse>> handler,
        CancellationToken ct
    )
    {
        var requests = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<IReadOnlyList<ExcuseRequestResponse>>.Ok(requests));
    }
}
