using System.ComponentModel.DataAnnotations;
using Caps.Auth.Application.DTOs.Responses;
using Caps.Auth.Application.Features.Stats;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Auth.Api.Controllers;

/// <summary>Account figures for the System Admin dashboard.</summary>
[ApiController, Route("api/v1/admin/users/stats")]
[RequirePermission(Permission.UserManage)]
public sealed class AdminUserStatsController : ControllerBase
{
    /// <summary>New accounts per calendar month and the total at the end of each month.</summary>
    /// <remarks>
    /// Months follow Vietnam time (UTC+7), oldest first, and end with the current month, which is marked
    /// partial. months defaults to 12 and is at most 36. Accounts still waiting for email verification are
    /// not counted.
    /// </remarks>
    /// <response code="200">The monthly periods.</response>
    /// <response code="400">months is outside 1-36.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the UserManage permission.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetUserStatsQuery, UserStatsResponse> handler,
        CancellationToken ct,
        [FromQuery, Range(1, StatMonths.MaxCount)] int months = 12
    )
    {
        var stats = await handler.HandleAsync(new(months), ct);
        return Ok(ApiResponse<UserStatsResponse>.Ok(stats));
    }
}
