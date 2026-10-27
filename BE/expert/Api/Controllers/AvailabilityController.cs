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
/// The signed-in expert's availability: how many cases they run at once (capacity, shared by all services) and
/// a per-service switch for new requests. A service is listed on the Marketplace once it is approved, priced,
/// switched on and the expert has set a capacity (BR-M01); a full expert stays listed as full.
/// </summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/availability")]
public sealed class AvailabilityController(ICurrentUser currentUser) : ControllerBase
{
    private Applicant Applicant => Applicant.From(currentUser);

    private static OkObjectResult Result(MyAvailabilityResponse data) =>
        new(ApiResponse<MyAvailabilityResponse>.Ok(data));

    /// <summary>Returns the capacity, the cases holding a slot and the request switch of each service.</summary>
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

    /// <summary>Sets how many cases the expert runs at once, shared by all their services.</summary>
    /// <remarks>
    /// Running cases are never touched: lowering the capacity below them only stops new cases until enough
    /// end. A slot is taken when the expert accepts a case, not when the client pays.
    /// </remarks>
    /// <response code="200">The availability view with the new capacity.</response>
    /// <response code="400">CAPACITY_INVALID: outside 1–20.</response>
    /// <response code="404">EXPERT_NOT_FOUND: no expert profile yet.</response>
    [HttpPut]
    public async Task<IActionResult> SetCapacity(
        CapacityRequest r,
        [FromServices] ICommandHandler<SetCapacityCommand, MyAvailabilityResponse> handler,
        CancellationToken ct
    )
    {
        var view = await handler.HandleAsync(new(Applicant, r.Capacity), ct);
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
