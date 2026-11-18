using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.CreditPackages;
using Caps.Common.Api;
using Caps.Common.Application;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>Credit packages on sale (no sign-in): the wallet and the public pricing page show them.</summary>
[ApiController, AllowAnonymous, Route("api/v1/billing/credit-packages")]
public sealed class CreditPackagesController : ControllerBase
{
    /// <summary>Lists the packages on sale in display order.</summary>
    /// <remarks>
    /// A package with price null is on sale but not priced yet: show it without a buy action. Buy a package with
    /// POST payos/create-topup and its id.
    /// </remarks>
    /// <response code="200">The packages on sale (may be empty).</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListCreditPackagesQuery, CreditPackageResponse[]> handler,
        CancellationToken ct
    )
    {
        var packages = await handler.HandleAsync(new(OnSaleOnly: true), ct);
        return Ok(ApiResponse<CreditPackageResponse[]>.Ok(packages));
    }
}
