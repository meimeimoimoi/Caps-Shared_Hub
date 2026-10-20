using Caps.Billing.Api.DTOs.Requests;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.Escrows;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>Staff closing of escrows held for review cases: release to the expert or refund to the payer.</summary>
[ApiController, Route("api/v1/admin/billing/escrows")]
[RequirePermission(Permission.PayoutManage), RequireSessionCheck]
public sealed class AdminEscrowsController : ControllerBase
{
    /// <summary>Releases the escrow of a review case to the expert, minus the platform fee.</summary>
    /// <remarks>
    /// The held credits leave the payer's wallet. The settlement records the split (the fee is rounded down) and a
    /// PENDING payout is created for the expert with a snapshot of their default bank account; without one the
    /// bank details stay empty. The actual transfer is not made here.
    /// </remarks>
    /// <response code="200">The settlement with the expert's payout.</response>
    /// <response code="400">Invalid input or INVALID_PLATFORM_FEE.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PayoutManage permission.</response>
    /// <response code="404">ESCROW_NOT_FOUND.</response>
    /// <response code="409">ESCROW_NOT_HELD: already released or refunded.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{reviewCaseId:guid}/release")]
    public async Task<IActionResult> Release(
        Guid reviewCaseId,
        ReleaseEscrowRequest r,
        [FromServices] ICommandHandler<ReleaseEscrowCommand, SettlementResponse> handler,
        CancellationToken ct
    )
    {
        var settlement = await handler.HandleAsync(r.ToCommand(reviewCaseId), ct);
        return Ok(ApiResponse<SettlementResponse>.Ok(settlement));
    }

    /// <summary>Refunds the escrow of a review case to the payer's credits.</summary>
    /// <remarks>The held credits go back to the payer's balance; no bank transfer is made.</remarks>
    /// <response code="200">The settlement.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PayoutManage permission.</response>
    /// <response code="404">ESCROW_NOT_FOUND.</response>
    /// <response code="409">ESCROW_NOT_HELD: already released or refunded.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{reviewCaseId:guid}/refund")]
    public async Task<IActionResult> Refund(
        Guid reviewCaseId,
        [FromServices] ICommandHandler<RefundEscrowCommand, SettlementResponse> handler,
        CancellationToken ct
    )
    {
        var settlement = await handler.HandleAsync(new(reviewCaseId), ct);
        return Ok(ApiResponse<SettlementResponse>.Ok(settlement));
    }
}
