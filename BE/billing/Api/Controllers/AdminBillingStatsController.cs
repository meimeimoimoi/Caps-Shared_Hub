using System.ComponentModel.DataAnnotations;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.Stats;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>Billing figures for the System Admin dashboard.</summary>
[ApiController, Route("api/v1/admin/billing/stats")]
[RequirePermission(Permission.PayoutManage), RequireSessionCheck]
public sealed class AdminBillingStatsController : ControllerBase
{
    /// <summary>Money settled per calendar month, plus escrow and payout totals per status.</summary>
    /// <remarks>
    /// Months follow Vietnam time (UTC+7), oldest first, and end with the current month, which is marked
    /// partial so it is not compared with a full month. months defaults to 12 and is at most 36. Amounts are
    /// in VND: expertPayout and platformFee come from released escrows, refunds from refunded ones.
    /// </remarks>
    /// <response code="200">The monthly periods and the current totals per status.</response>
    /// <response code="400">months is outside 1–36.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PayoutManage permission.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromServices] IQueryHandler<GetBillingStatsQuery, BillingStatsResponse> handler,
        CancellationToken ct,
        [FromQuery, Range(1, StatMonths.MaxCount)] int months = 12
    )
    {
        var stats = await handler.HandleAsync(new(months), ct);
        return Ok(ApiResponse<BillingStatsResponse>.Ok(stats));
    }
}
