using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Availability;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// The signed-in expert's availability: open slots shared by all services and a per-service switch for new
/// requests. A service is listed on the Marketplace once it is approved, priced, switched on and the expert
/// has an open slot (BR-M01).
/// </summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/availability")]
public sealed class AvailabilityController(ICurrentUser currentUser) : ControllerBase
{
    private Applicant Applicant => Applicant.From(currentUser);

    private static OkObjectResult Result(MyAvailabilityResponse data) =>
        new(ApiResponse<MyAvailabilityResponse>.Ok(data));

    /// <summary>Returns the open slots, the request switch of each service and the slot rules.</summary>
    /// <response code="200">The availability view (empty before the expert has a profile).</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetMyAvailabilityQuery, MyAvailabilityResponse> handler,
        CancellationToken ct
    )
    {
        var view = await handler.HandleAsync(new(Applicant), ct);
        return Result(view);
    }

    /// <summary>Opens a slot.</summary>
    /// <response code="200">The availability view with the new slot.</response>
    /// <response code="400">SLOT_IN_PAST, SLOT_TOO_FAR_AHEAD or SLOT_LENGTH_INVALID.</response>
    /// <response code="404">EXPERT_NOT_FOUND: no expert profile yet.</response>
    /// <response code="409">SLOT_OVERLAP or SLOT_LIMIT.</response>
    [HttpPost("slots")]
    public async Task<IActionResult> AddSlot(
        AddSlotRequest r,
        [FromServices] ICommandHandler<AddSlotCommand, MyAvailabilityResponse> handler,
        CancellationToken ct
    )
    {
        var view = await handler.HandleAsync(r.ToCommand(Applicant), ct);
        return Result(view);
    }

    /// <summary>Removes an open slot.</summary>
    /// <response code="200">The availability view without the slot.</response>
    /// <response code="404">EXPERT_NOT_FOUND or SLOT_NOT_FOUND.</response>
    /// <response code="409">SLOT_LOCKED: the slot is booked.</response>
    [HttpDelete("slots/{id:guid}")]
    public async Task<IActionResult> RemoveSlot(
        Guid id,
        [FromServices] ICommandHandler<RemoveSlotCommand, MyAvailabilityResponse> handler,
        CancellationToken ct
    )
    {
        var view = await handler.HandleAsync(new(Applicant, id), ct);
        return Result(view);
    }

    /// <summary>Turns new requests on or off for one service.</summary>
    /// <param name="serviceCode">Catalog service code, e.g. HUMAN_VERIFICATION.</param>
    /// <response code="200">The availability view.</response>
    /// <response code="404">EXPERT_NOT_FOUND or QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">SERVICE_NOT_APPROVED: requests can only be turned on for an approved service.</response>
    [HttpPut("services/{serviceCode}")]
    public async Task<IActionResult> SetAccepting(
        string serviceCode,
        ServiceAcceptingRequest r,
        [FromServices] ICommandHandler<SetServiceAcceptingCommand, MyAvailabilityResponse> handler,
        CancellationToken ct
    )
    {
        var view = await handler.HandleAsync(r.ToCommand(Applicant, serviceCode), ct);
        return Result(view);
    }
}
