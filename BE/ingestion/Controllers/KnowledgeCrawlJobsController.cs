using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Ingestion.DTOs.Requests;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Features.CrawlJobs;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Ingestion.Controllers;

/// <summary>Crawls of vbpl.vn and vbpq.mof.gov.vn that bring new legal documents into the review queue.</summary>
[ApiController, RequirePermission(Permission.KnowledgeManage)]
[Route("api/v1/knowledge/crawl-jobs")]
public sealed class KnowledgeCrawlJobsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists crawl runs, newest first.</summary>
    /// <remarks>
    /// page starts at 1; pageSize defaults to 20 and is at most 100. Once a job has finished, detail.result
    /// holds the worker's summary or error.
    /// </remarks>
    /// <response code="200">The page with the total number of runs.</response>
    /// <response code="400">INVALID_PAGING.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListCrawlJobsQuery, PageResponse<CrawlJobResponse>> handler,
        CancellationToken ct,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20
    )
    {
        var jobs = await handler.HandleAsync(new(page, pageSize), ct);
        return Ok(ApiResponse<PageResponse<CrawlJobResponse>>.Ok(jobs));
    }

    /// <summary>Starts a manual crawl; the crawler worker runs it in the background.</summary>
    /// <remarks>
    /// sources: vbpl and/or mof. topN = newest documents per document type (crawler default 3);
    /// all = every matching result (slow). Documents found arrive in the pending queue as PENDING.
    /// </remarks>
    /// <response code="202">The new job, RUNNING.</response>
    /// <response code="400">Invalid body or INVALID_CRAWL_SOURCE.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    /// <response code="409">CRAWL_ALREADY_RUNNING: wait until the running job finishes.</response>
    [HttpPost]
    public async Task<IActionResult> Trigger(
        TriggerCrawlRequest r,
        [FromServices] ICommandHandler<TriggerCrawlCommand, CrawlJobResponse> handler,
        CancellationToken ct
    )
    {
        var job = await handler.HandleAsync(r.ToCommand(UserId), ct);
        return Accepted(ApiResponse<CrawlJobResponse>.Ok(job));
    }
}
