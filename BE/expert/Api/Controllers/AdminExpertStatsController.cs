using System.ComponentModel.DataAnnotations;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Stats;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>Expert figures for the System Admin dashboard.</summary>
[ApiController, RequirePermission(Permission.ExpertApprove)]
[Route("api/v1/admin/experts/stats")]
public sealed class AdminExpertStatsController : ControllerBase
{
    /// <summary>New experts per calendar month, plus how many experts are serving or suspended now.</summary>
    /// <remarks>
    /// Months follow Vietnam time (UTC+7), oldest first, and end with the current month, which is marked
    /// partial. months defaults to 12 and is at most 36. A new expert is counted in the month of their first
    /// final approval for any service; reinstating a suspended service does not count again.
    /// </remarks>
    /// <response code="200">The monthly periods and the current counts.</response>
    /// <response code="400">months is outside 1-36.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetExpertStatsQuery, ExpertStatsResponse> handler,
        CancellationToken ct,
        [FromQuery, Range(1, StatMonths.MaxCount)] int months = 12
    )
    {
        var stats = await handler.HandleAsync(new(months), ct);
        return Ok(ApiResponse<ExpertStatsResponse>.Ok(stats));
    }
}
