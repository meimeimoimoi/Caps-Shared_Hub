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

    /// <summary>Returns the amendment family tree of a legal source.</summary>
    /// <remarks>
    /// The root is the original source, found by following what this source amends; each node's children are
    /// the sources amending it, at most 10 levels deep. A source without recorded links is a single node.
    /// </remarks>
    /// <response code="200">The root node with its children.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account is not active.</response>
    /// <response code="404">SOURCE_NOT_FOUND.</response>
    [HttpGet("{id:guid}/tree")]
    public async Task<IActionResult> Tree(
        Guid id,
        [FromServices] IQueryHandler<GetSourceTreeQuery, AmendmentTreeNodeResponse> handler,
        CancellationToken ct
    )
    {
        var tree = await handler.HandleAsync(new(id), ct);
        return Ok(ApiResponse<AmendmentTreeNodeResponse>.Ok(tree));
    }
}
