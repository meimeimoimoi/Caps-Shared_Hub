using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Reviews;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// Gate 2 (competency) review of Expert-Service qualifications by authorized reviewers. Gate 2 is decided
/// per service; PASS waits for the System Admin final approval before the expert can offer the service.
/// </summary>
[ApiController, RequirePermission(Permission.ExpertReview)]
[Route("api/v1/admin/experts/qualifications")]
public sealed class QualificationReviewsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists qualifications in one status, oldest submission first.</summary>
    /// <param name="status">Defaults to COMPETENCY_REVIEW (waiting for Gate 2).</param>
    /// <response code="200">The queue (may be empty).</response>
    /// <response code="403">Missing the ExpertReview permission.</response>
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

    /// <summary>Returns one qualification with the expert's details, files, history, Gate 1 and Gate 2 results.</summary>
    /// <remarks>evidence lists the Gate 1 files first, then the files added for this service (code COMPETENCY).</remarks>
    /// <response code="200">The qualification.</response>
    /// <response code="403">Missing the ExpertReview permission.</response>
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

    /// <summary>Downloads one file the qualification can rely on.</summary>
    /// <response code="200">The file bytes.</response>
    /// <response code="403">Missing the ExpertReview permission.</response>
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

    /// <summary>Records the Gate 2 decision from the results of C1…C5.</summary>
    /// <remarks>
    /// Every competency needs a note; PASS and FAIL must cite at least one file of the qualification.
    /// Any FAIL → FAIL (closed; the service can be registered again after the policy wait, 90 days).
    /// Otherwise any NEED_MORE_INFORMATION → back to the expert, who supplements the same qualification.
    /// All PASS → PENDING_FINAL_APPROVAL. Years of experience never pass a competency by themselves.
    /// </remarks>
    /// <response code="200">The qualification after the decision.</response>
    /// <response code="400">INVALID_COMPETENCY_CRITERIA, INVALID_COMPETENCY_RESULT, COMPETENCY_NOTE_REQUIRED, COMPETENCY_EVIDENCE_REQUIRED or COMPETENCY_EVIDENCE_UNKNOWN.</response>
    /// <response code="403">Missing the ExpertReview permission, or SELF_REVIEW_NOT_ALLOWED.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_NOT_IN_REVIEW: only COMPETENCY_REVIEW qualifications can be decided.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/competency-decision"), RequireSessionCheck]
    public async Task<IActionResult> Decide(
        Guid id,
        CompetencyDecisionRequest r,
        [FromServices]
            ICommandHandler<DecideCompetencyCommand, ReviewQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(r.ToCommand(UserId, id), ct);
        return Ok(ApiResponse<ReviewQualificationResponse>.Ok(qualification));
    }
}
