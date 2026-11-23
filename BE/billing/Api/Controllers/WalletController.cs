using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.Wallet;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>The signed-in user's own credit wallet.</summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/billing/wallet")]
public sealed class WalletController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Returns the available balance and the amount currently held.</summary>
    /// <remarks>A user who has never topped up gets balance = 0, held = 0 and updatedAt = null.</remarks>
    /// <response code="200">The wallet.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetMyWalletQuery, WalletResponse> handler,
        CancellationToken ct
    )
    {
        var wallet = await handler.HandleAsync(new(UserId), ct);
        return Ok(ApiResponse<WalletResponse>.Ok(wallet));
    }

    /// <summary>Returns one page of the wallet history (top-ups, holds, charges, refunds), newest first.</summary>
    /// <remarks>page starts at 1; pageSize defaults to 20 and is at most 100.</remarks>
    /// <response code="200">The page with the total number of movements.</response>
    /// <response code="400">INVALID_PAGING.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    [HttpGet("ledger")]
    public async Task<IActionResult> Ledger(
        [FromServices] IQueryHandler<GetMyLedgerQuery, LedgerPageResponse> handler,
        CancellationToken ct,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20
    )
    {
        var ledger = await handler.HandleAsync(new(UserId, page, pageSize), ct);
        return Ok(ApiResponse<LedgerPageResponse>.Ok(ledger));
    }
}
