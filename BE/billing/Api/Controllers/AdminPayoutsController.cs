using System.ComponentModel.DataAnnotations;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.Payouts;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>Staff view of payouts and refunds to users and experts (SYSTEM_ADMIN).</summary>
[ApiController, Route("api/v1/admin/billing/payouts")]
[RequirePermission(Permission.PayoutManage), RequireSessionCheck]
public sealed class AdminPayoutsController : ControllerBase
{
    /// <summary>Lists payouts newest first, optionally filtered by status.</summary>
    /// <remarks>
    /// status is matched case-insensitively (e.g. PENDING); page starts at 1, pageSize defaults to 20 and is at
    /// most 100. Bank details are the snapshot taken when the payout was created (last 4 digits only).
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
        [FromQuery] int pageSize = 20
    )
    {
        var payouts = await handler.HandleAsync(new(status, page, pageSize), ct);
        return Ok(ApiResponse<PayoutPageResponse>.Ok(payouts));
    }
}
