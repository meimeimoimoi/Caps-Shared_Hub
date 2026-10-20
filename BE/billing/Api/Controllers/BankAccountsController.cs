using Caps.Billing.Api.DTOs.Requests;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.BankAccounts;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>
/// The signed-in user's payout bank accounts. Every action answers with the full list, because adding or
/// removing an account can move the default.
/// </summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/billing/bank-accounts")]
public sealed class BankAccountsController(ICurrentUser currentUser) : ControllerBase
{
    private Guid UserId => currentUser.RequireUserId();

    private static OkObjectResult Result(BankAccountResponse[] data) =>
        new(ApiResponse<BankAccountResponse[]>.Ok(data));

    /// <summary>Lists linked bank accounts, default first then newest.</summary>
    /// <remarks>Only the last 4 digits of each number are returned.</remarks>
    /// <response code="200">The linked accounts (empty when none).</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListBankAccountsQuery, BankAccountResponse[]> handler,
        CancellationToken ct
    )
    {
        var accounts = await handler.HandleAsync(new(UserId), ct);
        return Result(accounts);
    }

    /// <summary>Links a new bank account.</summary>
    /// <remarks>
    /// The first account becomes the default automatically; isDefault = true moves the default to the new one.
    /// At most 5 linked accounts. The number is stored encrypted and starts as UNVERIFIED.
    /// </remarks>
    /// <response code="200">All linked accounts, including the new one.</response>
    /// <response code="400">INVALID_BANK_ACCOUNT (bankBin, bankName, accountNumber or accountHolderName).</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="409">BANK_ACCOUNT_DUPLICATE or BANK_ACCOUNT_LIMIT.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost, RequireSessionCheck]
    public async Task<IActionResult> Add(
        AddBankAccountRequest r,
        [FromServices] ICommandHandler<AddBankAccountCommand, BankAccountResponse[]> handler,
        CancellationToken ct
    )
    {
        var accounts = await handler.HandleAsync(r.ToCommand(UserId), ct);
        return Result(accounts);
    }

    /// <summary>Removes a linked bank account (soft delete, payout history keeps it).</summary>
    /// <remarks>Removing the default makes the newest remaining account the default.</remarks>
    /// <response code="200">The remaining linked accounts.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="404">BANK_ACCOUNT_NOT_FOUND (unknown, already removed or another user's).</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpDelete("{id:guid}"), RequireSessionCheck]
    public async Task<IActionResult> Remove(
        Guid id,
        [FromServices] ICommandHandler<RemoveBankAccountCommand, BankAccountResponse[]> handler,
        CancellationToken ct
    )
    {
        var accounts = await handler.HandleAsync(new(UserId, id), ct);
        return Result(accounts);
    }
}
