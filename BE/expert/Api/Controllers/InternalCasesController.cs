using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.ReviewCases;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// Calls from the workflow service for review cases. They need the X-Internal-Key header instead of a user
/// token, and the gateway does not route them.
/// </summary>
[ApiController, RequireInternalKey, Route("internal/experts/{profileId:guid}")]
public sealed class InternalCasesController : ControllerBase
{
    /// <summary>The offer a new review case freezes: price, turnaround, platform fee and late rule.</summary>
    /// <response code="200">The expert sells the service now.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="404">EXPERT_NOT_BOOKABLE: not listed for this service (not approved, paused, unpriced).</response>
    [HttpGet("offers/{serviceCode}")]
    public async Task<IActionResult> GetOffer(
        Guid profileId,
        string serviceCode,
        [FromServices] IQueryHandler<GetReviewOfferQuery, ReviewOfferResponse> handler,
        CancellationToken ct
    )
    {
        var offer = await handler.HandleAsync(new(profileId, serviceCode), ct);
        return Ok(ApiResponse<ReviewOfferResponse>.Ok(offer));
    }

    /// <summary>The expert accepted the case: it takes one slot. Safe to repeat for the same case.</summary>
    /// <response code="204">The case holds a slot.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="409">EXPERT_FULL: no free slot; CASE_SLOT_CONFLICT: the case holds another expert's slot.</response>
    [HttpPut("slots/{reviewCaseId:guid}")]
    public async Task<IActionResult> TakeSlot(
        Guid profileId,
        Guid reviewCaseId,
        [FromServices] ICommandHandler<TakeCaseSlotCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(profileId, reviewCaseId), ct);
        return NoContent();
    }

    /// <summary>The case ended: its slot is free again. Safe to repeat.</summary>
    /// <response code="204">The case holds no slot now.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    [HttpDelete("slots/{reviewCaseId:guid}")]
    public async Task<IActionResult> ReleaseSlot(
        Guid profileId,
        Guid reviewCaseId,
        [FromServices] ICommandHandler<ReleaseCaseSlotCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(profileId, reviewCaseId), ct);
        return NoContent();
    }
}
