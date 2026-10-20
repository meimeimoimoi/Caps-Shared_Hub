using System.ComponentModel.DataAnnotations;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Features.Sources;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Ingestion.Controllers;

/// <summary>
/// The legal source catalog (laws, decrees, circulars) and how sources amend each other.
/// Any signed-in active account may read it.
/// </summary>
[ApiController, Authorize, Route("api/v1/knowledge/sources")]
public sealed class KnowledgeSourcesController : ControllerBase
{
    /// <summary>Searches legal sources by document number or title.</summary>
    /// <remarks>
    /// q matches part of the number or title, case-insensitively; docType matches exactly (e.g. Thông tư).
    /// latestEffectiveFrom/To come from the newest APPROVED or INDEXED version. amends lists the sources this
    /// one amends, amendedBy the ones amending it. page starts at 1; pageSize defaults to 20, at most 100.
    /// </remarks>
    /// <response code="200">The page with the total number of matching sources.</response>
    /// <response code="400">Invalid query or INVALID_PAGING.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account is not active.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListSourcesQuery, PageResponse<LegalSourceResponse>> handler,
        CancellationToken ct,
        [FromQuery, MaxLength(200)] string? q = null,
        [FromQuery, MaxLength(128)] string? docType = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20
    )
    {
        var sources = await handler.HandleAsync(new(q, docType, page, pageSize), ct);
        return Ok(ApiResponse<PageResponse<LegalSourceResponse>>.Ok(sources));
    }
}
