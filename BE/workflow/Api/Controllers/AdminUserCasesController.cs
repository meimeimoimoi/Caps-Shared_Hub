using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.ReviewCases;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>Review cases of one account, for the staff who lock accounts.</summary>
[ApiController, Route("api/v1/admin/review-cases"), RequirePermission(Permission.UserManage)]
public sealed class AdminUserCasesController : ControllerBase
{
    /// <summary>Counts the user's open review cases, shown before the account is locked.</summary>
    /// <remarks>Open = from booking until the case ends, disputes included. Lock an expert only at 0:
    /// suspend their services first so no new request comes in.</remarks>
    /// <param name="userId">The account about to be locked.</param>
    /// <param name="handler">Query handler counting the cases.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">Open cases as the client and as the expert.</response>
    /// <response code="403">Missing the UserManage permission.</response>
    [HttpGet("open-count")]
    public async Task<IActionResult> OpenCount(
        [FromQuery] Guid userId,
        [FromServices] IQueryHandler<CountOpenCasesQuery, OpenCaseCountResponse> handler,
        CancellationToken ct
    )
    {
        var count = await handler.HandleAsync(new(userId), ct);
        return Ok(ApiResponse<OpenCaseCountResponse>.Ok(count));
    }
}
