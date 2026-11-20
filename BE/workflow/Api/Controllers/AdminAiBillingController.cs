using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Caps.Workflow.Api.DTOs.Requests;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.AiBilling;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Workflow.Api.Controllers;

/// <summary>The paid-AI switch for pricing managers: charge AI chat and drafting, or let everyone use them free.</summary>
[ApiController, RequirePermission(Permission.PricingManage)]
[Route("api/v1/admin/ai-billing")]
public sealed class AdminAiBillingController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Returns whether paid AI is on and the AI prices.</summary>
    /// <remarks>updatedAt and updatedBy are null while the server settings (AiBilling) still apply.</remarks>
    /// <response code="200">The switch.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PricingManage permission.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetAiBillingSwitchQuery, AiBillingSwitchResponse> handler,
        CancellationToken ct
    )
    {
        var billing = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<AiBillingSwitchResponse>.Ok(billing));
    }

    /// <summary>Turns paid AI on or off for every user.</summary>
    /// <remarks>
    /// On: AI chat and draft generation use each user's free quota, then wallet credits. Off: they are free.
    /// Applies from the next AI request, without a restart.
    /// </remarks>
    /// <response code="200">The saved switch.</response>
    /// <response code="400">enabled is missing.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PricingManage permission.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPut, RequireSessionCheck]
    public async Task<IActionResult> Set(
        SetAiBillingSwitchRequest r,
        [FromServices] ICommandHandler<SetAiBillingSwitchCommand, AiBillingSwitchResponse> handler,
        CancellationToken ct
    )
    {
        var billing = await handler.HandleAsync(r.ToCommand(UserId), ct);
        return Ok(ApiResponse<AiBillingSwitchResponse>.Ok(billing));
    }

    /// <summary>Sets what AI chat and drafting cost, and how many free uses a new account gets.</summary>
    /// <remarks>
    /// chatCreditCost / draftCreditCost: credits held per answered chat question / per AI draft once the free
    /// uses run out; 0 makes it free. initialFreeQuota: free AI uses an account gets on its first AI request;
    /// accounts that already used AI keep their balance. Applies from the next AI request, without a restart.
    /// </remarks>
    /// <response code="200">The saved switch and prices.</response>
    /// <response code="400">A value is missing or negative.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PricingManage permission.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPut("prices"), RequireSessionCheck]
    public async Task<IActionResult> SetPrices(
        SetAiPricesRequest r,
        [FromServices] ICommandHandler<SetAiPricesCommand, AiBillingSwitchResponse> handler,
        CancellationToken ct
    )
    {
        var billing = await handler.HandleAsync(r.ToCommand(UserId), ct);
        return Ok(ApiResponse<AiBillingSwitchResponse>.Ok(billing));
    }
}
