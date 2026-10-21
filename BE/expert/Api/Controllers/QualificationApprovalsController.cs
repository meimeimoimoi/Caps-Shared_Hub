using System.ComponentModel.DataAnnotations;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Approvals;
using Caps.Expert.Application.Features.Reviews;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// Final approval of Gate 2 results by System Admins: a governance check per Expert-Service, not a new
/// assessment. APPROVED_FOR_SERVICE lets the expert set up pricing for that service.
/// </summary>
[ApiController, RequirePermission(Permission.ExpertApprove)]
[Route("api/v1/admin/experts/approvals")]
public sealed class QualificationApprovalsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists qualifications in one status, oldest submission first.</summary>
    /// <param name="status">Defaults to COMPETENCY_REVIEW; pass PENDING_FINAL_APPROVAL for the approval queue.</param>
    /// <response code="200">The queue (may be empty).</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromServices]
            IQueryHandler<
            ListQualificationsForReviewQuery,
            IReadOnlyList<QualificationQueueItemResponse>
        > handler,
        CancellationToken ct
    )
    {
        var queue = await handler.HandleAsync(new(status), ct);
        return Ok(ApiResponse<IReadOnlyList<QualificationQueueItemResponse>>.Ok(queue));
    }

    /// <summary>Lists one page of qualifications in the given statuses, oldest submission first.</summary>
    /// <remarks>Repeat status for several statuses. q matches the expert's name or email, or the service name.</remarks>
    /// <response code="200">The page with the total number of matching qualifications.</response>
    /// <response code="400">INVALID_PAGING.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet("queue")]
    public async Task<IActionResult> Queue(
        [FromServices] IQueryHandler<SearchReviewQueueQuery, ReviewQueuePageResponse> handler,
        CancellationToken ct,
        [FromQuery] string[]? status = null,
        [FromQuery, MaxLength(SearchReviewQueueHandler.MaxSearchLength)] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10
    )
    {
        var query = new SearchReviewQueueQuery([], status ?? [], q, page, pageSize);
        var queue = await handler.HandleAsync(query, ct);
        return Ok(ApiResponse<ReviewQueuePageResponse>.Ok(queue));
    }

    /// <summary>Counts qualifications per status, for the approval tabs.</summary>
    /// <response code="200">Counts keyed by status.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet("queue/counts")]
    public async Task<IActionResult> QueueCounts(
        [FromServices] IQueryHandler<CountReviewQueueQuery, ReviewQueueCountsResponse> handler,
        CancellationToken ct
    )
    {
        var counts = await handler.HandleAsync(new CountReviewQueueQuery(), ct);
        return Ok(ApiResponse<ReviewQueueCountsResponse>.Ok(counts));
    }

    /// <summary>Returns one qualification with its records: Gate 1 and Gate 2 results, files and history.</summary>
    /// <response code="200">The qualification.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(
        Guid id,
        [FromServices]
            IQueryHandler<GetQualificationForReviewQuery, ReviewQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(new(id), ct);
        return Ok(ApiResponse<ReviewQualificationResponse>.Ok(qualification));
    }

    /// <summary>Downloads one file the qualification relies on.</summary>
    /// <response code="200">The file bytes.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND or EVIDENCE_NOT_FOUND.</response>
    [HttpGet("{id:guid}/evidence/{evidenceId:guid}/file")]
    public async Task<IActionResult> OpenEvidence(
        Guid id,
        Guid evidenceId,
        [FromServices] IQueryHandler<OpenQualificationEvidenceQuery, ExpertEvidenceFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(id, evidenceId), ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }

    /// <summary>Records the final approval: APPROVE or RETURN_FOR_REVIEW.</summary>
    /// <remarks>
    /// APPROVE → APPROVED_FOR_SERVICE. RETURN_FOR_REVIEW (note required) → back to COMPETENCY_REVIEW for a
    /// new Gate 2 decision. The approver cannot be the Gate 2 reviewer or the expert.
    /// </remarks>
    /// <response code="200">The qualification after the decision.</response>
    /// <response code="400">INVALID_FINAL_APPROVAL_DECISION or FINAL_APPROVAL_NOTE_REQUIRED.</response>
    /// <response code="403">Missing the ExpertApprove permission, FINAL_APPROVER_IS_REVIEWER or SELF_REVIEW_NOT_ALLOWED.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_NOT_PENDING_APPROVAL.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/final-decision"), RequireSessionCheck]
    public async Task<IActionResult> Decide(
        Guid id,
        FinalApprovalRequest r,
        [FromServices]
            ICommandHandler<DecideFinalApprovalCommand, ReviewQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(r.ToCommand(UserId, id), ct);
        return Ok(ApiResponse<ReviewQualificationResponse>.Ok(qualification));
    }

    /// <summary>Suspends an approved service or reinstates a suspended one.</summary>
    /// <remarks>
    /// SUSPEND (note required) hides the service from the Marketplace; running cases continue. REINSTATE makes
    /// it available again. Other services of the expert are not affected.
    /// </remarks>
    /// <response code="200">The qualification after the change.</response>
    /// <response code="400">INVALID_SERVICE_ACCESS_ACTION or SUSPENSION_NOTE_REQUIRED.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">SERVICE_NOT_APPROVED or SERVICE_NOT_SUSPENDED.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/service-access"), RequireSessionCheck]
    public async Task<IActionResult> ChangeAccess(
        Guid id,
        ServiceAccessRequest r,
        [FromServices]
            ICommandHandler<ChangeServiceAccessCommand, ReviewQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(r.ToCommand(UserId, id), ct);
        return Ok(ApiResponse<ReviewQualificationResponse>.Ok(qualification));
    }
}
