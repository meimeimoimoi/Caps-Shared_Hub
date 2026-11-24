using System.ComponentModel.DataAnnotations;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.ReviewCases;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>Case details for the staff money screens (refunds and payouts).</summary>
[ApiController, Route("api/v1/admin/review-cases"), RequirePermission(Permission.PayoutManage)]
public sealed class AdminReviewCasesController : ControllerBase
{
    /// <summary>Returns the client email and the expert of each case.</summary>
    /// <param name="ids">Review case ids, repeated: ?ids=a&amp;ids=b; at most 100.</param>
    /// <param name="handler">Query handler reading the cases.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <response code="200">One row per known case; unknown ids are skipped.</response>
    /// <response code="400">More than 100 ids.</response>
    /// <response code="403">The account lacks the PayoutManage permission.</response>
    [HttpGet("parties")]
    public async Task<IActionResult> Parties(
        [FromQuery, MaxLength(100)] Guid[] ids,
        [FromServices] IQueryHandler<ListCasePartiesQuery, CasePartiesResponse[]> handler,
        CancellationToken ct
    )
    {
        var parties = await handler.HandleAsync(new(ids), ct);
        return Ok(ApiResponse<CasePartiesResponse[]>.Ok(parties));
    }
}
