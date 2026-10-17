using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Slots;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>The signed-in expert's availability slots.</summary>
[ApiController, RequirePermission(Permission.ServiceManage), Route("api/v1/experts/me/slots")]
public sealed class SlotsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists the expert's slots that have not ended yet, earliest first.</summary>
    /// <response code="200">Upcoming slots.</response>
    /// <response code="403">Missing ServiceManage permission, or NOT_APPROVED_FOR_SERVICE.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListMySlotQuery, IReadOnlyList<SlotResponse>> handler,
        CancellationToken ct
    )
    {
        var slots = await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<IReadOnlyList<SlotResponse>>.Ok(slots));
    }

    /// <summary>Opens a slot for booking.</summary>
    /// <response code="200">The new slot.</response>
    /// <response code="400">SLOT_INVALID_TIME.</response>
    /// <response code="403">Missing ServiceManage permission, or NOT_APPROVED_FOR_SERVICE.</response>
    /// <response code="409">SLOT_OVERLAPS.</response>
    [HttpPost]
    public async Task<IActionResult> Open(
        OpenSlotRequest r,
        [FromServices] ICommandHandler<OpenSlotCommand, SlotResponse> handler,
        CancellationToken ct
    )
    {
        var slot = await handler.HandleAsync(new(UserId, r.StartAt, r.EndAt), ct);
        return Ok(ApiResponse<SlotResponse>.Ok(slot));
    }

    /// <summary>Removes an open slot.</summary>
    /// <response code="204">Removed.</response>
    /// <response code="404">SLOT_NOT_FOUND.</response>
    /// <response code="409">SLOT_NOT_OPEN: the slot is booked.</response>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remove(
        Guid id,
        [FromServices] ICommandHandler<RemoveSlotCommand, bool> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(UserId, id), ct);
        return NoContent();
    }
}
