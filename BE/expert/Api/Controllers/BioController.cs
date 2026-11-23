using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Profiles;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>The signed-in expert's public profile: what clients read on the marketplace.</summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/bio")]
public sealed class BioController(ICurrentUser currentUser) : ControllerBase
{
    private Applicant Applicant => Applicant.From(currentUser);

    /// <summary>Gets the public profile as clients see it.</summary>
    /// <remarks>While the expert is not listed it comes without services or rating.</remarks>
    /// <response code="200">The public profile.</response>
    /// <response code="403">EMAIL_NOT_VERIFIED.</response>
    /// <response code="404">EXPERT_NOT_FOUND: no draft has been saved yet.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetMyBioQuery, MarketplaceExpertResponse> handler,
        CancellationToken ct
    )
    {
        var bio = await handler.HandleAsync(new(Applicant), ct);
        return Ok(ApiResponse<MarketplaceExpertResponse>.Ok(bio));
    }

    /// <summary>Saves the headline, location, bio, fields and highlights.</summary>
    /// <remarks>
    /// Clients see the change right away; no review is needed. Years of experience are kept as reviewed.
    /// </remarks>
    /// <response code="200">The saved public profile.</response>
    /// <response code="400">Invalid input.</response>
    /// <response code="403">EMAIL_NOT_VERIFIED.</response>
    /// <response code="404">EXPERT_NOT_FOUND: no draft has been saved yet.</response>
    [HttpPut]
    public async Task<IActionResult> Update(
        UpdateMyBioRequest r,
        [FromServices] ICommandHandler<UpdateMyBioCommand, MarketplaceExpertResponse> handler,
        CancellationToken ct
    )
    {
        var bio = await handler.HandleAsync(r.ToCommand(Applicant), ct);
        return Ok(ApiResponse<MarketplaceExpertResponse>.Ok(bio));
    }
}
