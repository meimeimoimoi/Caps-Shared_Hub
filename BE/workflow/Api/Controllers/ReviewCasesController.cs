using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Api.DTOs.Requests;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.ReviewCases;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>
/// Review cases between a client and an expert: request, prepay, accept or decline, questions, delivery
/// and acceptance. Only the two parties see a case; to anyone else it does not exist.
/// </summary>
[ApiController, Authorize, Route("api/v1/review-cases")]
public sealed class ReviewCasesController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Returns the caller's cases as client or expert, newest first.</summary>
    /// <response code="200">The cases (may be empty).</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListMyReviewCaseQuery, ReviewCaseResponse[]> handler,
        CancellationToken ct
    )
    {
        var cases = await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<ReviewCaseResponse[]>.Ok(cases));
    }

    /// <summary>Returns one case.</summary>
    /// <response code="200">The case.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also when the caller is not a party).</response>
    [HttpGet("{caseId:guid}")]
    public async Task<IActionResult> Get(
        Guid caseId,
        [FromServices] IQueryHandler<GetReviewCaseQuery, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>Requests a review of one document version; the case waits 15 minutes for payment.</summary>
    /// <remarks>Price, platform fee and turnaround are read from the expert service and frozen on the case.</remarks>
    /// <response code="200">The case, AWAITING_PAYMENT.</response>
    /// <response code="400">TEXT_REQUIRED or TEXT_TOO_LONG.</response>
    /// <response code="404">DOCUMENT_NOT_FOUND or EXPERT_SERVICE_UNAVAILABLE.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE: the expert service cannot be reached.</response>
    [HttpPost]
    public async Task<IActionResult> Create(
        RequestReviewRequest r,
        [FromServices] ICommandHandler<RequestReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(r.ToCommand(UserId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>Pays the case fee from the client's credits; the expert then has 24 hours to answer.</summary>
    /// <response code="200">The case, PENDING_EXPERT_RESPONSE.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID or CASE_DEADLINE_PASSED.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/pay"), RequireSessionCheck]
    public async Task<IActionResult> Pay(
        Guid caseId,
        [FromServices] ICommandHandler<PayReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert accepts a paid request; the delivery deadline starts now.</summary>
    /// <response code="200">The case, IN_REVIEW.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND (also when the caller is not the case's expert).</response>
    /// <response code="409">CASE_STATUS_INVALID or CASE_DEADLINE_PASSED.</response>
    [HttpPost("{caseId:guid}/accept")]
    public async Task<IActionResult> Accept(
        Guid caseId,
        [FromServices] ICommandHandler<AcceptReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert declines a paid request; the client is refunded in full.</summary>
    /// <response code="200">The case, EXPERT_DECLINED.</response>
    /// <response code="400">TEXT_REQUIRED or TEXT_TOO_LONG (reason).</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/decline"), RequireSessionCheck]
    public async Task<IActionResult> Decline(
        Guid caseId,
        DeclineReviewRequest r,
        [FromServices] ICommandHandler<DeclineReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, r.Reason), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert asks the client for missing information; the review pauses.</summary>
    /// <response code="200">The case, AWAITING_USER_INFORMATION.</response>
    /// <response code="400">TEXT_REQUIRED or TEXT_TOO_LONG.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    // <response code="409">CASE_STATUS_INVALID or INFO_REQUEST_LIMIT (asked twice already).</response>
    [HttpPost("{caseId:guid}/request-information")]
    public async Task<IActionResult> RequestInformation(
        Guid caseId,
        CaseTextRequest r,
        [FromServices] ICommandHandler<RequestInformationCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, r.Message), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The client answers the expert's question; the delivery deadline moves back by the wait.</summary>
    /// <response code="200">The case, IN_REVIEW.</response>
    /// <response code="400">TEXT_REQUIRED or TEXT_TOO_LONG.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID or INFO_REQUEST_CLOSED.</response>
    [HttpPost("{caseId:guid}/provide-information")]
    public async Task<IActionResult> ProvideInformation(
        Guid caseId,
        CaseTextRequest r,
        [FromServices] ICommandHandler<ProvideInformationCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId, r.Message), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The expert delivers the result; the client has 72 hours to confirm, then it auto-confirms.</summary>
    /// <response code="200">The case, AWAITING_ACCEPTANCE.</response>
    /// <response code="400">RESULT_INVALID, TEXT_REQUIRED or TEXT_TOO_LONG.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID or CASE_DEADLINE_PASSED (past the late cancel hours).</response>
    [HttpPost("{caseId:guid}/deliver")]
    public async Task<IActionResult> Deliver(
        Guid caseId,
        DeliverReviewRequest r,
        [FromServices] ICommandHandler<DeliverReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(
            new(UserId, caseId, r.Result, r.Summary, r.CannotVerifyReason),
            ct
        );
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }

    /// <summary>The client accepts the result; the expert is paid minus the platform fee.</summary>
    /// <response code="200">The case, COMPLETED.</response>
    /// <response code="404">REVIEW_CASE_NOT_FOUND.</response>
    /// <response code="409">CASE_STATUS_INVALID.</response>
    /// <response code="503">SERVICE_LINK_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{caseId:guid}/confirm"), RequireSessionCheck]
    public async Task<IActionResult> Confirm(
        Guid caseId,
        [FromServices] ICommandHandler<ConfirmReviewCommand, ReviewCaseResponse> handler,
        CancellationToken ct
    )
    {
        var reviewCase = await handler.HandleAsync(new(UserId, caseId), ct);
        return Ok(ApiResponse<ReviewCaseResponse>.Ok(reviewCase));
    }
}
