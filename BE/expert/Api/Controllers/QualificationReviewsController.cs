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

    /// <summary>Takes the qualification from the shared queue so only the caller can decide it.</summary>
    /// <remarks>
    /// One conditional update: of two reviewers claiming at once only one wins. Claiming again while holding it
    /// changes nothing. The claim lasts ReviewClaimHours (policy, 72 by default) and is kept while more
    /// information is requested; the resubmission restarts it. A final decision frees the qualification.
    /// </remarks>
    /// <response code="200">The qualification with the caller as holder.</response>
    /// <response code="403">Missing the ExpertReview permission, or SELF_REVIEW_NOT_ALLOWED.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">REVIEW_CLAIMED (another reviewer holds it) or QUALIFICATION_NOT_IN_REVIEW.</response>
    [HttpPost("{id:guid}/claim")]
    public async Task<IActionResult> Claim(
        Guid id,
        [FromServices]
            ICommandHandler<ClaimQualificationCommand, ReviewQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(new(UserId, currentUser.Email, id), ct);
        return Ok(ApiResponse<ReviewQualificationResponse>.Ok(qualification));
    }

    /// <summary>Gives the qualification back to the shared queue.</summary>
    /// <response code="200">The qualification without a holder.</response>
    /// <response code="403">Missing the ExpertReview permission.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">REVIEW_NOT_CLAIMED: the caller does not hold it.</response>
    [HttpPost("{id:guid}/release")]
    public async Task<IActionResult> Release(
        Guid id,
        [FromServices]
            ICommandHandler<ReleaseQualificationCommand, ReviewQualificationResponse> handler,
        CancellationToken ct
    )
    {
        var qualification = await handler.HandleAsync(new(UserId, id), ct);
        return Ok(ApiResponse<ReviewQualificationResponse>.Ok(qualification));
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
    /// <response code="409">QUALIFICATION_NOT_IN_REVIEW (only COMPETENCY_REVIEW qualifications can be decided) or REVIEW_NOT_CLAIMED (claim it first; it returned to the queue or belongs to another reviewer).</response>
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
