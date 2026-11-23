using Caps.Billing.Api.DTOs.Requests;
using Caps.Billing.Application.Features.AiCredits;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>
/// Calls from the workflow service to hold, capture, or release prepaid credits for AI operations.
/// Protected by X-Internal-Key and never exposed through the gateway. Every call is safe to repeat.
/// </summary>
[ApiController, RequireInternalKey, Route("internal/ai-credits/{aiUsageId:guid}")]
public sealed class InternalAiCreditsController : ControllerBase
{
    /// <summary>Holds AI credits from the user's wallet; repeating the same hold succeeds.</summary>
    /// <response code="204">The AI credits are held.</response>
    /// <response code="400">INVALID_AMOUNT or a missing field.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="409">INSUFFICIENT_CREDITS, AI_CREDIT_HOLD_CONFLICT, or AI_CREDIT_HOLD_CLOSED.</response>
    [HttpPut]
    public async Task<IActionResult> Hold(
        Guid aiUsageId,
        HoldAiCreditRequest r,
        [FromServices] ICommandHandler<HoldAiCreditCommand> handler,
        CancellationToken ct
    )
    {
        await handler.HandleAsync(r.ToCommand(aiUsageId), ct);
        return NoContent();
    }

    /// <summary>Captures previously held AI credits after the AI call completes; repeating succeeds.</summary>
    /// <response code="204">The held AI credits are captured.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="404">AI_CREDIT_HOLD_NOT_FOUND.</response>
    /// <response code="409">AI_CREDIT_HOLD_CLOSED: already released.</response>
    [HttpPost("capture")]
    public async Task<IActionResult> Capture(
        Guid aiUsageId,
        [FromBody] CaptureAiCreditRequest? r,
        [FromServices] ICommandHandler<CaptureAiCreditCommand> handler,
        CancellationToken ct
    )
    {
        var command = (r ?? new CaptureAiCreditRequest()).ToCommand(aiUsageId);
        await handler.HandleAsync(command, ct);
        return NoContent();
    }

    /// <summary>Returns held AI credits to the user's spendable balance; repeating succeeds.</summary>
    /// <response code="204">The held AI credits are returned to the wallet balance.</response>
    /// <response code="401">INTERNAL_KEY_INVALID.</response>
    /// <response code="404">AI_CREDIT_HOLD_NOT_FOUND.</response>
    /// <response code="409">AI_CREDIT_HOLD_CLOSED: already captured.</response>
    [HttpPost("release")]
    public async Task<IActionResult> Release(
        Guid aiUsageId,
        [FromBody] ReleaseAiCreditRequest? r,
        [FromServices] ICommandHandler<ReleaseAiCreditCommand> handler,
        CancellationToken ct
    )
    {
        var command = (r ?? new ReleaseAiCreditRequest()).ToCommand(aiUsageId);
        await handler.HandleAsync(command, ct);
        return NoContent();
    }
}
