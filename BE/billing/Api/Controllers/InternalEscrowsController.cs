using Caps.Billing.Api.DTOs.Requests;
using Caps.Billing.Application.Features.Escrows;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>
/// Calls from the workflow service for review case money. They need the X-Internal-Key header instead of a
/// user token, and the gateway does not route them. Every call is safe to repeat.
/// </summary>
[ApiController, RequireInternalKey, Route("internal/escrows/{reviewCaseId:guid}")]
public sealed class InternalEscrowsController : ControllerBase
{
    /// <summary>Holds the case fee from the client's credits; repeating the same hold succeeds.</summary>
    /// <response code="204">The fee is held.</response>
    /// <response code="400">INVALID_AMOUNT or a missing field.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="409">INSUFFICIENT_CREDITS; ESCROW_ALREADY_EXISTS: a different hold for this case.</response>
    [HttpPut]
    public async Task<IActionResult> Hold(
        Guid reviewCaseId,
        HoldCaseEscrowRequest r,
        [FromServices] ICommandHandler<HoldCaseEscrowCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(r.ToCommand(reviewCaseId), ct);
        return NoContent();
    }

    /// <summary>Returns the whole fee to the client; repeating succeeds.</summary>
    /// <response code="204">The fee is back in the client's balance.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="404">ESCROW_NOT_FOUND.</response>
    /// <response code="409">ESCROW_NOT_HELD: already paid out to the expert.</response>
    [HttpPost("refund")]
    public async Task<IActionResult> Refund(
        Guid reviewCaseId,
        [FromServices] ICommandHandler<RefundCaseEscrowCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(new(reviewCaseId), ct);
        return NoContent();
    }

    /// <summary>Settles a completed case with the workflow's split; repeating succeeds.</summary>
    /// <response code="204">Refund returned, expert payout pending, platform fee recorded.</response>
    /// <response code="400">SETTLEMENT_MISMATCH: the parts do not add up to the held fee.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="404">ESCROW_NOT_FOUND.</response>
    /// <response code="409">ESCROW_NOT_HELD: already refunded.</response>
    [HttpPost("settle")]
    public async Task<IActionResult> Settle(
        Guid reviewCaseId,
        SettleCaseEscrowRequest r,
        [FromServices] ICommandHandler<SettleCaseEscrowCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(r.ToCommand(reviewCaseId), ct);
        return NoContent();
    }
}
