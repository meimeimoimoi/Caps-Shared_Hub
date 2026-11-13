using System.ComponentModel.DataAnnotations;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Features.Stats;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Ingestion.Controllers;

/// <summary>Knowledge base figures for the Knowledge Admin dashboard.</summary>
[ApiController, RequirePermission(Permission.KnowledgeManage)]
[Route("api/v1/knowledge/stats")]
public sealed class KnowledgeStatsController : ControllerBase
{
    /// <summary>Pipeline counts now, documents per month, the indexed base per type and recent crawls.</summary>
    /// <remarks>
    /// Months follow Vietnam time (UTC+7), oldest first, and end with the current month, which is marked
    /// partial. months defaults to 12 and is at most 36. crawled/uploaded count versions by arrival;
    /// newDocuments/newVersions count versions by the time they were indexed. pendingAges groups the
    /// documents waiting for review by whole days waited.
    /// </remarks>
    /// <response code="200">The figures.</response>
    /// <response code="400">months is outside 1-36.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">Missing the KnowledgeManage permission.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetKnowledgeStatsQuery, KnowledgeStatsResponse> handler,
        CancellationToken ct,
        [FromQuery, Range(1, StatMonths.MaxCount)] int months = 12
    )
    {
        var stats = await handler.HandleAsync(new(months), ct);
        return Ok(ApiResponse<KnowledgeStatsResponse>.Ok(stats));
    }
}
