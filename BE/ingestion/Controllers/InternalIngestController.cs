using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Ingestion.DTOs.Requests;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Features.CrawlJobs;
using Caps.Ingestion.Features.Documents;
using Caps.Ingestion.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Ingestion.Controllers;

/// <summary>
/// Endpoints for the Python crawler worker (crawler/worker.py). They need the X-Internal-Key header instead
/// of a user token, and the gateway does not route them.
/// </summary>
[ApiController, RequireInternalKey, Route("internal")]
public sealed class InternalIngestController : ControllerBase
{
    /// <summary>Imports one document found by a crawl job.</summary>
    /// <remarks>
    /// Body: one crawler export file (schema_version 2) as written to export/; chunks are ignored. The document
    /// becomes a PENDING version of its legal source. A file hash already stored is skipped (imported = false),
    /// so resending is safe.
    /// </remarks>
    /// <response code="200">The document id and whether it was new.</response>
    /// <response code="400">Invalid body, INVALID_DOCUMENT_SOURCE or INVALID_CONTENT_JSON.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="404">CRAWL_JOB_NOT_FOUND.</response>
    /// <response code="409">CRAWL_JOB_NOT_RUNNING.</response>
    [HttpPost("crawl-jobs/{id:guid}/documents")]
    public async Task<IActionResult> ImportDocument(
        Guid id,
        CrawledDocumentRequest r,
        [FromServices]
            ICommandHandler<ImportCrawledDocumentCommand, ImportedDocumentResponse> handler,
        CancellationToken ct
    )
    {
        var document = await handler.HandleAsync(r.ToCommand(id), ct);
        return Ok(ApiResponse<ImportedDocumentResponse>.Ok(document));
    }

    /// <summary>Records the end of a crawl job.</summary>
    /// <remarks>
    /// status: SUCCEEDED or FAILED. detail (the worker's summary or error) is kept under detail.result,
    /// next to the original request.
    /// </remarks>
    /// <response code="200">The finished job.</response>
    /// <response code="400">Invalid body or INVALID_CRAWL_JOB_STATUS.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="404">CRAWL_JOB_NOT_FOUND.</response>
    /// <response code="409">CRAWL_JOB_NOT_RUNNING.</response>
    [HttpPost("crawl-jobs/{id:guid}/complete")]
    public async Task<IActionResult> CompleteCrawlJob(
        Guid id,
        CompleteCrawlJobRequest r,
        [FromServices] ICommandHandler<CompleteCrawlJobCommand, CrawlJobResponse> handler,
        CancellationToken ct
    )
    {
        var job = await handler.HandleAsync(r.ToCommand(id), ct);
        return Ok(ApiResponse<CrawlJobResponse>.Ok(job));
    }
}
