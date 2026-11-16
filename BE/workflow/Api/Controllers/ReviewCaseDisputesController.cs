using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Api.DTOs.Requests;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Disputes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>
/// A client's complaint about a delivered review, raised before they accept it. The case then waits for a
/// system admin instead of auto-confirming, and the expert may explain once. Only the two parties see it.
/// </summary>
[ApiController, Authorize, Route("api/v1/review-cases/{caseId:guid}/dispute")]
public sealed class ReviewCaseDisputesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Returns the case's dispute.</summary>
    /// <response code="200">The dispute.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also when the caller is not a party) or DISPUTE_NOT_FOUND.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        Guid caseId,
        [FromServices] IQueryHandler<GetDisputeQuery, DisputeResponse> handler,
        CancellationToken ct
    )
    {
        var dispute = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<DisputeResponse>.Ok(dispute));
    }

    /// <summary>The client disputes the delivery instead of accepting it.</summary>
    /// <response code="200">The dispute, OPEN; the case is DISPUTED.</response>
    /// <response code="400">DISPUTE_REASON_INVALID or TEXT_REQUIRED.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID (not awaiting acceptance, or already disputed) or CASE_DEADLINE_PASSED.</response>
    [HttpPost]
    public async Task<IActionResult> Open(
        Guid caseId,
        OpenDisputeRequest r,
        [FromServices] ICommandHandler<OpenDisputeCommand, DisputeResponse> handler,
        CancellationToken ct
    )
    {
        var dispute = await handler.HandleAsync(new(UserId, caseId, r.Reason, r.Description), ct);
        return Ok(ApiResponse<DisputeResponse>.Ok(dispute));
    }

    /// <summary>The client withdraws the dispute, which accepts the delivery and settles the case.</summary>
    /// <response code="200">The case, COMPLETED.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND or DISPUTE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID: the dispute is already closed.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("withdraw"), RequireSessionCheck]
    public async Task<IActionResult> Withdraw(
        Guid caseId,
        [FromServices] ICommandHandler<WithdrawDisputeCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert explains once, for the admin to read before deciding.</summary>
    /// <response code="200">The dispute with the statement.</response>
    /// <response code="400">TEXT_REQUIRED.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND or DISPUTE_NOT_FOUND.</response>
    /// <response code="409">DISPUTE_STATEMENT_EXISTS or CASE_STATUS_INVALID.</response>
    [HttpPost("statement")]
    public async Task<IActionResult> AddStatement(
        Guid caseId,
        CaseTextRequest r,
        [FromServices] ICommandHandler<AddDisputeStatementCommand, DisputeResponse> handler,
        CancellationToken ct
    )
    {
        var dispute = await handler.HandleAsync(new(UserId, caseId, r.Message), ct);
        return Ok(ApiResponse<DisputeResponse>.Ok(dispute));
    }
}
