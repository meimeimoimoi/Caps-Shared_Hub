using System.ComponentModel.DataAnnotations;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Reviews;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// The reviewer's work queue across eligibility applications and service qualifications, paged and
/// counted in the database. The per-status lists under /applications and /qualifications stay for older clients.
/// </summary>
[ApiController, RequirePermission(Permission.ExpertReview)]
[Route("api/v1/admin/experts/review-queue")]
public sealed class ReviewQueueController : ControllerBase
{
    /// <summary>Lists one page of the queue, oldest submission first.</summary>
    /// <remarks>
    /// Repeat applicationStatus and qualificationStatus to include several statuses; leave one out to skip that
    /// kind of record (e.g. only qualificationStatus for the competency queue). q matches the expert's name or
    /// email, and the service name of a qualification.
    /// </remarks>
    /// <response code="200">The page with the total number of matching records.</response>
    /// <response code="400">INVALID_PAGING.</response>
    /// <response code="403">Missing the ExpertReview permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<SearchReviewQueueQuery, ReviewQueuePageResponse> handler,
        CancellationToken ct,
        [FromQuery] string[]? applicationStatus = null,
        [FromQuery] string[]? qualificationStatus = null,
        [FromQuery, MaxLength(SearchReviewQueueHandler.MaxSearchLength)] string? q = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10
    )
    {
        var query = new SearchReviewQueueQuery(
            applicationStatus ?? [],
            qualificationStatus ?? [],
            q,
            page,
            pageSize
        );
        var queue = await handler.HandleAsync(query, ct);
        return Ok(ApiResponse<ReviewQueuePageResponse>.Ok(queue));
    }

    /// <summary>Counts applications and qualifications per status.</summary>
    /// <remarks>For tab counts and sidebar badges; no records are returned.</remarks>
    /// <response code="200">Counts keyed by status.</response>
    /// <response code="403">Missing the ExpertReview permission.</response>
    [HttpGet("counts")]
    public async Task<IActionResult> Counts(
        [FromServices] IQueryHandler<CountReviewQueueQuery, ReviewQueueCountsResponse> handler,
        CancellationToken ct
    )
    {
        var counts = await handler.HandleAsync(new CountReviewQueueQuery(), ct);
        return Ok(ApiResponse<ReviewQueueCountsResponse>.Ok(counts));
    }
}
