using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Marketplace;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

[ApiController, AllowAnonymous, Route("api/v1/marketplace/experts")]
public sealed class MarketplaceController : ControllerBase
{
    /// <summary>Searches approved, active experts that have an open slot.</summary>
    /// <remarks>Sorted by rating; pageSize is capped at 50. HasMore says whether a next page exists.</remarks>
    /// <response code="200">One page of experts.</response>
    [HttpGet]
    public async Task<IActionResult> Search(
        [FromQuery] string? keyword,
        [FromQuery] string? field,
        [FromServices] IQueryHandler<SearchExpertQuery, MarketplacePage> handler,
        CancellationToken ct,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20
    )
    {
        var result = await handler.HandleAsync(new(keyword, field, page, pageSize), ct);
        return Ok(ApiResponse<MarketplacePage>.Ok(result));
    }

    /// <summary>Returns the public profile, rating and active service packages of one expert.</summary>
    /// <response code="200">The expert's public profile.</response>
    /// <response code="404">EXPERT_NOT_FOUND: unknown, not approved or not taking bookings.</response>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(
        Guid id,
        [FromServices] IQueryHandler<GetExpertProfileQuery, MarketplaceExpertDetail> handler,
        CancellationToken ct
    )
    {
        var expert = await handler.HandleAsync(new(id), ct);
        return Ok(ApiResponse<MarketplaceExpertDetail>.Ok(expert));
    }
}
