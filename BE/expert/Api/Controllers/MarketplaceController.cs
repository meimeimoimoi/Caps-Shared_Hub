using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Marketplace;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// Public Marketplace (no sign-in): experts listed per BR-M01 (account ACTIVE, service APPROVED_FOR_SERVICE and
/// ACTIVE, approved price in effect, requests on, a capacity set). CV and evidence are never returned.
/// </summary>
[ApiController, AllowAnonymous, Route("api/v1/marketplace/experts")]
public sealed class MarketplaceController : ControllerBase
{
    /// <summary>Lists bookable experts, best rated first.</summary>
    /// <param name="service">Only experts bookable for this service code, e.g. HUMAN_VERIFICATION.</param>
    /// <response code="200">The listed experts (may be empty).</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? service,
        [FromServices]
            IQueryHandler<
            ListMarketplaceExpertsQuery,
            IReadOnlyList<MarketplaceExpertResponse>
        > handler,
        CancellationToken ct
    )
    {
        var experts = await handler.HandleAsync(new(service), ct);
        return Ok(ApiResponse<IReadOnlyList<MarketplaceExpertResponse>>.Ok(experts));
    }

    /// <summary>Returns one listed expert's public profile and bookable services.</summary>
    /// <response code="200">The expert.</response>
    /// <response code="404">EXPERT_NOT_FOUND: unknown or not listed.</response>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(
        Guid id,
        [FromServices] IQueryHandler<GetMarketplaceExpertQuery, MarketplaceExpertResponse> handler,
        CancellationToken ct
    )
    {
        var expert = await handler.HandleAsync(new(id), ct);
        return Ok(ApiResponse<MarketplaceExpertResponse>.Ok(expert));
    }
}
