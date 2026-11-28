using System.ComponentModel.DataAnnotations;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.Payouts;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>Staff view and PayOS transfer of payouts to experts (SYSTEM_ADMIN).</summary>
[ApiController, Route("api/v1/admin/billing/payouts")]
[RequirePermission(Permission.PayoutManage), RequireSessionCheck]
public sealed class AdminPayoutsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists payouts newest first, optionally filtered by status.</summary>
    /// <remarks>
    /// status is matched case-insensitively (e.g. PENDING); page starts at 1, pageSize defaults to 20 and is at
    /// most 100. Bank details are the snapshot taken when the payout was created (last 4 digits only).
    /// sortBy accepts createdAt (default) or amount; sortDescending defaults to true. Sorting precedes paging.
    /// </remarks>
    /// <response code="200">The page with the total number of matching payouts.</response>
    /// <response code="400">Invalid input or INVALID_PAGING.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PayoutManage permission.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListPayoutsQuery, PayoutPageResponse> handler,
        CancellationToken ct,
        [FromQuery, MaxLength(32)] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery, MaxLength(32)] string? sortBy = null,
        [FromQuery] bool sortDescending = true
    )
    {
        var payouts = await handler.HandleAsync(
            new(status, page, pageSize, sortBy, sortDescending),
            ct
        );
        return Ok(ApiResponse<PayoutPageResponse>.Ok(payouts));
    }

    /// <summary>Sends a PENDING or FAILED payout to the expert's bank account through PayOS (chi hộ).</summary>
    /// <remarks>
    /// The payout goes to the snapshot account, or to the expert's current default account when it has none or the
    /// expert removed it. It becomes PROCESSING before PayOS is called; PayOS may already report SUCCEEDED or FAILED.
    /// A refusal (low payout balance, limits, invalid account) makes it FAILED with lastError, and it may be sent
    /// again. 503 PAYMENT_UNAVAILABLE after it became PROCESSING means the outcome is unknown: call refresh.
    /// </remarks>
    /// <response code="200">The payout after the attempt.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PayoutManage permission.</response>
    /// <response code="404">PAYOUT_NOT_FOUND.</response>
    /// <response code="409">PAYOUT_NOT_TRANSFERABLE (PROCESSING or SUCCEEDED) or PAYOUT_NO_BANK_ACCOUNT.</response>
    /// <response code="503">PAYMENT_UNAVAILABLE (payout keys missing or PayOS unreachable) or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{payoutId:guid}/transfer")]
    public async Task<IActionResult> Transfer(
        Guid payoutId,
        [FromServices] ICommandHandler<TransferPayoutCommand, PayoutResponse> handler,
        CancellationToken ct
    )
    {
        var payout = await handler.HandleAsync(new(payoutId, UserId), ct);
        return Ok(ApiResponse<PayoutResponse>.Ok(payout));
    }

    /// <summary>Reads the outcome of a PROCESSING payout from PayOS.</summary>
    /// <remarks>
    /// PayOS sends no payout webhook, so staff refresh PROCESSING payouts. Other payouts are returned unchanged. A
    /// transfer PayOS still does not know 10 minutes after it was sent becomes FAILED (NOT_RECEIVED) and may be
    /// sent again.
    /// </remarks>
    /// <response code="200">The payout, updated when PayOS reported a change.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PayoutManage permission.</response>
    /// <response code="404">PAYOUT_NOT_FOUND.</response>
    /// <response code="503">PAYMENT_UNAVAILABLE (payout keys missing or PayOS unreachable) or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("{payoutId:guid}/refresh")]
    public async Task<IActionResult> Refresh(
        Guid payoutId,
        [FromServices] ICommandHandler<RefreshPayoutCommand, PayoutResponse> handler,
        CancellationToken ct
    )
    {
        var payout = await handler.HandleAsync(new(payoutId), ct);
        return Ok(ApiResponse<PayoutResponse>.Ok(payout));
    }
}
