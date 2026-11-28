using System.ComponentModel.DataAnnotations;
using Caps.Billing.Api.DTOs.Requests;
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
    /// sortBy accepts due (default: unsent first, oldest first), createdAt or amount; recipientUserId, from/to (created) and minAmount/maxAmount filter
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
        [FromQuery] bool sortDescending = true,
        [FromQuery] Guid? recipientUserId = null,
        [FromQuery] DateTimeOffset? from = null,
        [FromQuery] DateTimeOffset? to = null,
        [FromQuery] long? minAmount = null,
        [FromQuery] long? maxAmount = null
    )
    {
        var payouts = await handler.HandleAsync(
            new(
                status,
                page,
                pageSize,
                sortBy,
                sortDescending,
                recipientUserId,
                from,
                to,
                minAmount,
                maxAmount
            ),
            ct
        );
        return Ok(ApiResponse<PayoutPageResponse>.Ok(payouts));
    }

    /// <summary>Downloads the payouts paid in [from, to) as CSV, to match against the bank statement.</summary>
    /// <remarks>
    /// Columns: payout id, case id, expert id and email, bank, last 4 digits, amount, fee, bank transaction id,
    /// transfer time (Vietnam time) and the confirming staff member. The range spans at most 366 days.
    /// </remarks>
    /// <response code="200">The CSV file (UTF-8 with BOM).</response>
    /// <response code="400">PAYOUT_EXPORT_RANGE_INVALID.</response>
    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery, Required] DateTimeOffset from,
        [FromQuery, Required] DateTimeOffset to,
        [FromServices] IQueryHandler<ExportPaidPayoutsQuery, PayoutCsvFile> handler,
        CancellationToken ct
    )
    {
        var file = await handler.HandleAsync(new(from, to), ct);
        return File(file.Content, "text/csv; charset=utf-8", file.FileName);
    }

    /// <summary>Unsent payouts by deadline stage and the PayOS payout balance, for the page banner.</summary>
    /// <response code="200">The counts; balance is null when PayOS cannot be read.</response>
    [HttpGet("summary")]
    public async Task<IActionResult> Summary(
        [FromServices] IQueryHandler<GetPayoutSummaryQuery, PayoutSummaryResponse> handler,
        CancellationToken ct
    )
    {
        var summary = await handler.HandleAsync(new(), ct);
        return Ok(ApiResponse<PayoutSummaryResponse>.Ok(summary));
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

    /// <summary>Holds an unsent payout for review: a reason (10+ characters) and a review deadline (1–30 days).</summary>
    /// <response code="200">Held; it cannot be sent and its deadline waits.</response>
    /// <response code="409">PAYOUT_NOT_TRANSFERABLE (being sent or paid).</response>
    /// <response code="422">PAYOUT_HOLD_INVALID.</response>
    [HttpPost("{payoutId:guid}/hold")]
    public async Task<IActionResult> Hold(
        Guid payoutId,
        HoldPayoutRequest r,
        [FromServices] ICommandHandler<HoldPayoutCommand, PayoutResponse> handler,
        CancellationToken ct
    )
    {
        var payout = await handler.HandleAsync(
            new(payoutId, UserId, false, r.Reason, r.ReviewDays),
            ct
        );
        return Ok(ApiResponse<PayoutResponse>.Ok(payout));
    }

    /// <summary>Lifts a hold after review, with an optional note; the deadline restarts.</summary>
    /// <response code="200">Released.</response>
    /// <response code="409">PAYOUT_NOT_HELD.</response>
    [HttpPost("{payoutId:guid}/release")]
    public async Task<IActionResult> Release(
        Guid payoutId,
        ReleasePayoutRequest r,
        [FromServices] ICommandHandler<HoldPayoutCommand, PayoutResponse> handler,
        CancellationToken ct
    )
    {
        var payout = await handler.HandleAsync(new(payoutId, UserId, true, r.Note), ct);
        return Ok(ApiResponse<PayoutResponse>.Ok(payout));
    }

    /// <summary>What to pay by hand: bank, full account number, holder, amount and a transfer description.</summary>
    /// <remarks>
    /// For when no PayOS payout channel is configured. The account is the one a PayOS transfer would use: the
    /// snapshot account if still verified, otherwise the expert's verified default. Nothing changes until confirm.
    /// </remarks>
    /// <response code="200">The transfer details.</response>
    /// <response code="404">PAYOUT_NOT_FOUND.</response>
    /// <response code="409">PAYOUT_NOT_TRANSFERABLE, PAYOUT_NO_BANK_ACCOUNT or PAYOUT_ACCOUNT_NOT_VERIFIED.</response>
    [HttpGet("{payoutId:guid}/manual")]
    public async Task<IActionResult> ManualInfo(
        Guid payoutId,
        [FromServices]
            IQueryHandler<GetPayoutTransferInfoQuery, PayoutTransferInfoResponse> handler,
        CancellationToken ct
    )
    {
        var info = await handler.HandleAsync(new(payoutId), ct);
        return Ok(ApiResponse<PayoutTransferInfoResponse>.Ok(info));
    }

    /// <summary>Confirms a manual transfer: bank transaction id, the amount typed again, and when it was sent.</summary>
    /// <remarks>
    /// The payout becomes SUCCEEDED, the confirming staff member is kept in its history and the expert is told.
    /// The same checks as a PayOS transfer apply (7-day hold, staff hold, attempts, verified account).
    /// </remarks>
    /// <response code="200">The paid payout.</response>
    /// <response code="404">PAYOUT_NOT_FOUND.</response>
    /// <response code="409">PAYOUT_BANK_REF_USED, PAYOUT_CHANNEL_AVAILABLE, PAYOUT_NOT_TRANSFERABLE, PAYOUT_ON_HOLD, PAYOUT_HELD, PAYOUT_ATTEMPTS_EXHAUSTED or an account error.</response>
    /// <response code="400">PAYOUT_AMOUNT_MISMATCH or PAYOUT_MANUAL_INVALID (time in the future).</response>
    [HttpPost("{payoutId:guid}/manual/confirm")]
    public async Task<IActionResult> ConfirmManual(
        Guid payoutId,
        ConfirmManualPayoutRequest r,
        [FromServices] ICommandHandler<ConfirmManualPayoutCommand, PayoutResponse> handler,
        CancellationToken ct
    )
    {
        var payout = await handler.HandleAsync(
            new(payoutId, UserId, r.BankRef, r.Amount, r.TransferredAt),
            ct
        );
        return Ok(ApiResponse<PayoutResponse>.Ok(payout));
    }

    /// <summary>Reports a failed manual transfer with the bank's reason; it uses up one attempt.</summary>
    /// <response code="200">The FAILED payout; the expert is told.</response>
    /// <response code="404">PAYOUT_NOT_FOUND.</response>
    /// <response code="409">PAYOUT_CHANNEL_AVAILABLE, PAYOUT_NOT_TRANSFERABLE, PAYOUT_ON_HOLD, PAYOUT_HELD, PAYOUT_ATTEMPTS_EXHAUSTED or an account error.</response>
    [HttpPost("{payoutId:guid}/manual/fail")]
    public async Task<IActionResult> FailManual(
        Guid payoutId,
        FailManualPayoutRequest r,
        [FromServices] ICommandHandler<FailManualPayoutCommand, PayoutResponse> handler,
        CancellationToken ct
    )
    {
        var payout = await handler.HandleAsync(new(payoutId, UserId, r.Reason), ct);
        return Ok(ApiResponse<PayoutResponse>.Ok(payout));
    }
}
