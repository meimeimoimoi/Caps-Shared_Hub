using Caps.Billing.Api.DTOs.Requests;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.CreditPackages;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>Staff management of the credit packages sold through PayOS (SYSTEM_ADMIN).</summary>
[ApiController, Route("api/v1/admin/billing/credit-packages")]
[RequirePermission(Permission.PricingManage), RequireSessionCheck]
public sealed class AdminCreditPackagesController : ControllerBase
{
    /// <summary>Lists every package, including those taken off sale, in display order.</summary>
    /// <response code="200">The packages (may be empty).</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PricingManage permission.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpGet]
    public async Task<IActionResult> List(
        [FromServices] IQueryHandler<ListCreditPackagesQuery, CreditPackageResponse[]> handler,
        CancellationToken ct
    )
    {
        var packages = await handler.HandleAsync(new(OnSaleOnly: false), ct);
        return Ok(ApiResponse<CreditPackageResponse[]>.Ok(packages));
    }

    /// <summary>Adds a credit package.</summary>
    /// <remarks>A package without a price can be on sale but cannot be bought until a price is set.</remarks>
    /// <response code="200">The new package.</response>
    /// <response code="400">Invalid input or INVALID_CREDIT_PACKAGE (name, credits, price or order).</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PricingManage permission.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPost]
    public async Task<IActionResult> Create(
        SaveCreditPackageRequest r,
        [FromServices] ICommandHandler<CreateCreditPackageCommand, CreditPackageResponse> handler,
        CancellationToken ct
    )
    {
        var package = await handler.HandleAsync(new(r.ToDetails()), ct);
        return Ok(ApiResponse<CreditPackageResponse>.Ok(package));
    }

    /// <summary>Changes a credit package.</summary>
    /// <remarks>Payments already started keep the price and credits they were created with.</remarks>
    /// <response code="200">The changed package.</response>
    /// <response code="400">Invalid input or INVALID_CREDIT_PACKAGE (name, credits, price or order).</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="403">The account lacks the PricingManage permission.</response>
    /// <response code="404">CREDIT_PACKAGE_NOT_FOUND.</response>
    /// <response code="503">SESSION_CHECK_UNAVAILABLE: the session could not be checked.</response>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        SaveCreditPackageRequest r,
        [FromServices] ICommandHandler<UpdateCreditPackageCommand, CreditPackageResponse> handler,
        CancellationToken ct
    )
    {
        var package = await handler.HandleAsync(new(id, r.ToDetails()), ct);
        return Ok(ApiResponse<CreditPackageResponse>.Ok(package));
    }
}
