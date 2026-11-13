using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Experts;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>Experts past final approval, for the System Admin's expert management page.</summary>
[ApiController, RequirePermission(Permission.ExpertApprove)]
[Route("api/v1/admin/experts/managed")]
public sealed class AdminManagedExpertsController : ControllerBase
{
    /// <summary>Lists every Expert–Service in APPROVED_FOR_SERVICE or SUSPENDED, newest approval first.</summary>
    /// <remarks>
    /// One row per Expert–Service; id is the qualification id that
    /// POST /api/v1/admin/experts/approvals/{id}/service-access suspends or reinstates. fee and turnaroundHours
    /// are null while the expert has not priced the service. history holds the status changes, newest first;
    /// actor is the expert's name, a reviewer's email, SYSTEM, ADMIN (an admin without a known email) or a user id.
    /// </remarks>
    /// <response code="200">The rows (may be empty).</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices]
            IQueryHandler<ListManagedExpertsQuery, IReadOnlyList<ManagedExpertResponse>> handler,
        CancellationToken ct
    )
    {
        var experts = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<IReadOnlyList<ManagedExpertResponse>>.Ok(experts));
    }
}
