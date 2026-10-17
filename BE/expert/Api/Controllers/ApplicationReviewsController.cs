using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Reviews;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// Gate 1 (eligibility) review of expert applications by authorized reviewers. Gate 1 is decided per
/// expert, not per service: ELIGIBLE does not list the expert on the marketplace yet.
/// </summary>
[ApiController, RequirePermission(Permission.ExpertReview)]
[Route("api/v1/admin/experts/applications")]
public sealed class ApplicationReviewsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists applications in one status, oldest submission first.</summary>
    /// <param name="status">Defaults to SUBMITTED (waiting for Gate 1).</param>
    /// <response code="200">The queue (may be empty).</response>
    /// <response code="403">Missing the ExpertReview permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromServices]
            IQueryHandler<
            ListApplicationsForReviewQuery,
            IReadOnlyList<ReviewQueueItemResponse>
        > handler,
        CancellationToken ct
    )
    {
        var queue = await handler.HandleAsync(new(status), ct);
        return Ok(ApiResponse<IReadOnlyList<ReviewQueueItemResponse>>.Ok(queue));
    }

    /// <summary>Returns one application with its files, history and latest Gate 1 results.</summary>
    /// <remarks>suggestedExperienceResult is the EV-06 result the declared years point to.</remarks>
    /// <response code="200">The application.</response>
    /// <response code="403">Missing the ExpertReview permission.</response>
    /// <response code="404">APPLICATION_NOT_FOUND.</response>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(
        Guid id,
        [FromServices]
            IQueryHandler<GetApplicationForReviewQuery, ReviewApplicationResponse> handler,
        CancellationToken ct
    )
    {
        var application = await handler.HandleAsync(new(id), ct);
        return Ok(ApiResponse<ReviewApplicationResponse>.Ok(application));
    }

    /// <summary>Downloads one file of the application.</summary>
    /// <response code="200">The file bytes.</response>
    /// <response code="403">Missing the ExpertReview permission.</response>
    /// <response code="404">EVIDENCE_NOT_FOUND (also when the file belongs to another application).</response>
    [HttpGet("{id:guid}/evidence/{evidenceId:guid}/file")]
    public async Task<IActionResult> OpenEvidence(
        Guid id,
        Guid evidenceId,
        [FromServices] IQueryHandler<OpenApplicationEvidenceQuery, ExpertEvidenceFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(id, evidenceId), ct);
        Response.Headers.XContentTypeOptions = "nosniff";
        Response.Headers.CacheControl = "private, no-store";
        return File(file.Content, file.ContentType, file.FileName);
    }

    /// <summary>Records the Gate 1 decision from the results of EV-01…EV-06.</summary>
    /// <remarks>
    /// Any FAIL → NOT_ELIGIBLE (closed; a new application is allowed after the policy wait, 30 days).
    /// Otherwise any NEED_MORE_INFORMATION → back to the applicant, who supplements the same application.
    /// All PASS → ELIGIBLE. Every result other than PASS needs a note, shown to the applicant.
    /// </remarks>
    /// <response code="200">The application after the decision.</response>
    /// <response code="400">INVALID_ELIGIBILITY_CRITERIA, INVALID_ELIGIBILITY_RESULT, ELIGIBILITY_NOTE_REQUIRED or EXPERIENCE_BELOW_MINIMUM.</response>
    /// <response code="403">Missing the ExpertReview permission, or SELF_REVIEW_NOT_ALLOWED.</response>
    /// <response code="404">APPLICATION_NOT_FOUND.</response>
    /// <response code="409">APPLICATION_NOT_IN_REVIEW: only SUBMITTED applications can be decided.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/eligibility-decision"), RequireSessionCheck]
    public async Task<IActionResult> Decide(
        Guid id,
        EligibilityDecisionRequest r,
        [FromServices] ICommandHandler<DecideEligibilityCommand, ReviewApplicationResponse> handler,
        CancellationToken ct
    )
    {
        var application = await handler.HandleAsync(r.ToCommand(UserId, id), ct);
        return Ok(ApiResponse<ReviewApplicationResponse>.Ok(application));
    }
}
