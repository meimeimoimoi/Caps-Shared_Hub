using System.ComponentModel.DataAnnotations;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Assignments;
using Caps.Expert.Application.Features.Reviews;
using Caps.Expert.Domain.Reviews;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// System Admins see who works on each open Gate 1 and Gate 2 review and hand reviews to another reviewer
/// (one reviewer per review; claims expire after the ReviewClaimHours policy).
/// </summary>
[ApiController, RequirePermission(Permission.ExpertApprove)]
[Route("api/v1/admin/experts/review-assignments")]
public sealed class ReviewAssignmentsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists one page of reviews with their holders, oldest submission first.</summary>
    /// <remarks>
    /// Same filters as the reviewer queue (repeat applicationStatus and qualificationStatus); claim defaults to
    /// ALL here. Each row carries claimedByUserId, claimedByEmail and claimExpiresAt.
    /// </remarks>
    /// <response code="200">The page with the total number of matching reviews.</response>
    /// <response code="400">INVALID_PAGING.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<SearchReviewQueueQuery, ReviewQueuePageResponse> handler,
        CancellationToken ct,
        [FromQuery] string[]? applicationStatus = null,
        [FromQuery] string[]? qualificationStatus = null,
        [FromQuery, MaxLength(SearchReviewQueueHandler.MaxSearchLength)] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery, MaxLength(32)] string? claim = null
    )
    {
        var query = new SearchReviewQueueQuery(
            applicationStatus ?? [],
            qualificationStatus ?? [],
            q,
            page,
            pageSize,
            UserId,
            claim ?? ReviewClaimFilter.All
        );
        var queue = await handler.HandleAsync(query, ct);
        return Ok(ApiResponse<ReviewQueuePageResponse>.Ok(queue));
    }

    /// <summary>Reviewers a review can be handed to.</summary>
    /// <remarks>Reviewers are recorded when they open the review queue or claim a review.</remarks>
    /// <response code="200">Known reviewers by email.</response>
    /// <response code="403">Missing the ExpertApprove permission.</response>
    [HttpGet("reviewers")]
    public async Task<IActionResult> Reviewers(
        [FromServices]
            IQueryHandler<ListKnownReviewersQuery, IReadOnlyList<KnownReviewerResponse>> handler,
        CancellationToken ct
    )
    {
        var reviewers = await handler.HandleAsync(new ListKnownReviewersQuery(), ct);
        return Ok(ApiResponse<IReadOnlyList<KnownReviewerResponse>>.Ok(reviewers));
    }

    /// <summary>Hands a Gate 1 application to another reviewer.</summary>
    /// <remarks>
    /// Allowed while the application waits for Gate 1 or for the applicant's supplement; the hold restarts for
    /// the new reviewer. The reason is required and shown in the claim history.
    /// </remarks>
    /// <response code="200">The application's claim after the change.</response>
    /// <response code="400">CLAIM_REASSIGN_REASON_REQUIRED or CLAIM_REASSIGN_REASON_TOO_LONG.</response>
    /// <response code="403">Missing the ExpertApprove permission, or SELF_REVIEW_NOT_ALLOWED (the reviewer is the applicant).</response>
    /// <response code="404">APPLICATION_NOT_FOUND or REVIEWER_NOT_FOUND.</response>
    /// <response code="409">APPLICATION_NOT_IN_REVIEW.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("applications/{id:guid}"), RequireSessionCheck]
    public async Task<IActionResult> ReassignApplication(
        Guid id,
        ReassignReviewRequest r,
        [FromServices]
            ICommandHandler<ReassignApplicationCommand, ReviewClaimStateResponse> handler,
        CancellationToken ct
    )
    {
        var claim = await handler.HandleAsync(new(UserId, id, r.ReviewerUserId, r.Reason), ct);
        return Ok(ApiResponse<ReviewClaimStateResponse>.Ok(claim));
    }

    /// <summary>Hands a Gate 2 qualification to another reviewer.</summary>
    /// <remarks>
    /// Allowed while the qualification waits for Gate 2 or for the expert's supplement; the hold restarts for
    /// the new reviewer. The reason is required and shown in the claim history.
    /// </remarks>
    /// <response code="200">The qualification's claim after the change.</response>
    /// <response code="400">CLAIM_REASSIGN_REASON_REQUIRED or CLAIM_REASSIGN_REASON_TOO_LONG.</response>
    /// <response code="403">Missing the ExpertApprove permission, or SELF_REVIEW_NOT_ALLOWED (the reviewer is the expert).</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND or REVIEWER_NOT_FOUND.</response>
    /// <response code="409">QUALIFICATION_NOT_IN_REVIEW.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("qualifications/{id:guid}"), RequireSessionCheck]
    public async Task<IActionResult> ReassignQualification(
        Guid id,
        ReassignReviewRequest r,
        [FromServices]
            ICommandHandler<ReassignQualificationCommand, ReviewClaimStateResponse> handler,
        CancellationToken ct
    )
    {
        var claim = await handler.HandleAsync(new(UserId, id, r.ReviewerUserId, r.Reason), ct);
        return Ok(ApiResponse<ReviewClaimStateResponse>.Ok(claim));
    }
}
