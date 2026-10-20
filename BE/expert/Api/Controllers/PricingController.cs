using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Expert.Api.DTOs.Requests;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Pricing;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Expert.Api.Controllers;

/// <summary>
/// The signed-in expert's prices per approved service (POL-MKT-02). The first price, or a change of at most
/// the policy threshold (50%) from the price in effect, is approved at once; larger changes wait for a System Admin.
/// </summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/experts/me/pricing")]
public sealed class PricingController(ICurrentUser currentUser) : ControllerBase
{
    private Applicant Applicant => Applicant.From(currentUser);

    /// <summary>Returns every price version of the service, the audit trail and the pricing policy.</summary>
    /// <param name="serviceCode">Catalog service code, e.g. HUMAN_VERIFICATION.</param>
    /// <response code="200">The pricing workspace.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND: the expert never registered the service.</response>
    [HttpGet("{serviceCode}")]
    public async Task<IActionResult> Get(
        string serviceCode,
        [FromServices] IQueryHandler<GetMyPricingQuery, PricingWorkspaceResponse> handler,
        CancellationToken ct
    )
    {
        var workspace = await handler.HandleAsync(new(Applicant, serviceCode), ct);
        return Ok(ApiResponse<PricingWorkspaceResponse>.Ok(workspace));
    }

    /// <summary>Saves the draft price and, with submit = true, sends it for approval.</summary>
    /// <remarks>
    /// Only for a service that is APPROVED_FOR_SERVICE. Send the revision you loaded; a stale revision returns
    /// 409 PRICING_REVISION_CONFLICT. On submit the version becomes APPROVED (first price or change within the
    /// threshold, recorded as AUTO_APPROVED) or PENDING_APPROVAL.
    /// </remarks>
    /// <response code="200">The updated pricing workspace.</response>
    /// <response code="400">PRICE_OUT_OF_RANGE, EFFECTIVE_DATE_IN_PAST, PRICING_REASON_REQUIRED or PRICING_REASON_TOO_LONG.</response>
    /// <response code="404">QUALIFICATION_NOT_FOUND.</response>
    /// <response code="409">PRICING_NOT_ALLOWED, PRICING_PENDING_APPROVAL, PRICING_VERSION_LOCKED or PRICING_REVISION_CONFLICT.</response>
    [HttpPut("{serviceCode}")]
    public async Task<IActionResult> Save(
        string serviceCode,
        SavePricingRequest r,
        [FromServices] ICommandHandler<SaveMyPricingCommand, PricingWorkspaceResponse> handler,
        CancellationToken ct
    )
    {
        var workspace = await handler.HandleAsync(r.ToCommand(Applicant, serviceCode), ct);
        return Ok(ApiResponse<PricingWorkspaceResponse>.Ok(workspace));
    }
}
