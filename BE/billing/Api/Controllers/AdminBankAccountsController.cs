using System.ComponentModel.DataAnnotations;
using Caps.Billing.Api.DTOs.Requests;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.BankAccounts;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>Staff review of experts' payout bank accounts (SYSTEM_ADMIN); payouts only go to VERIFIED ones.</summary>
[ApiController, Route("api/v1/admin/billing/bank-accounts")]
[RequirePermission(Permission.PayoutManage), RequireSessionCheck]
public sealed class AdminBankAccountsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Lists linked bank accounts newest first, optionally filtered by status.</summary>
    /// <remarks>
    /// status is UNVERIFIED, VERIFIED or REJECTED (case-insensitive); page starts at 1, pageSize defaults to 20 and
    /// is at most 100. Removed accounts are left out. accountNumber is the full number, so staff can look the
    /// holder up in a banking app and compare it with the expert's registered name.
    /// </remarks>
    /// <response code="200">The page with the total number of matching accounts.</response>
    /// <response code="400">Invalid input or INVALID_PAGING.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PayoutManage permission.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices]
            IQueryHandler<ListBankAccountsForReviewQuery, ReviewBankAccountPageResponse> handler,
        CancellationToken ct,
        [FromQuery, MaxLength(32)] string? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20
    )
    {
        var accounts = await handler.HandleAsync(new(status, page, pageSize), ct);
        return Ok(ApiResponse<ReviewBankAccountPageResponse>.Ok(accounts));
    }

    /// <summary>Marks an UNVERIFIED bank account as VERIFIED, so payouts can be sent to it.</summary>
    /// <response code="200">The reviewed account.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PayoutManage permission, or BANK_ACCOUNT_SELF_REVIEW.</response>
    /// <response code="404">BANK_ACCOUNT_NOT_FOUND (unknown or removed).</response>
    /// <response code="409">BANK_ACCOUNT_ALREADY_REVIEWED.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/verify")]
    public async Task<IActionResult> Verify(
        Guid id,
        [FromServices] ICommandHandler<ReviewBankAccountCommand, ReviewBankAccountResponse> handler,
        CancellationToken ct
    )
    {
        var account = await handler.HandleAsync(new(id, UserId, true, null), ct);
        return Ok(ApiResponse<ReviewBankAccountResponse>.Ok(account));
    }

    /// <summary>Marks an UNVERIFIED bank account as REJECTED with a reason the expert sees.</summary>
    /// <remarks>The decision is final; the expert removes the account and links another one.</remarks>
    /// <response code="200">The reviewed account.</response>
    /// <response code="400">Invalid input or INVALID_BANK_ACCOUNT (reason empty or longer than 500).</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PayoutManage permission, or BANK_ACCOUNT_SELF_REVIEW.</response>
    /// <response code="404">BANK_ACCOUNT_NOT_FOUND (unknown or removed).</response>
    /// <response code="409">BANK_ACCOUNT_ALREADY_REVIEWED.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(
        Guid id,
        RejectBankAccountRequest r,
        [FromServices] ICommandHandler<ReviewBankAccountCommand, ReviewBankAccountResponse> handler,
        CancellationToken ct
    )
    {
        var account = await handler.HandleAsync(new(id, UserId, false, r.Reason), ct);
        return Ok(ApiResponse<ReviewBankAccountResponse>.Ok(account));
    }
}
