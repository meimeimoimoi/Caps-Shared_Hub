using Caps.Billing.Api.DTOs.Requests;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.Payments;
using Caps.Common.Api;
using Caps.Common.Application;
using Caps.Common.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Caps.Billing.Api.Controllers;

/// <summary>Payments through PayOS: starting a credit top-up, and PayOS's payment notifications (webhook).</summary>
[ApiController, Authorize(Policy = "AuthSession"), Route("api/v1/billing/payos")]
public sealed class PayOsController(ICurrentUser currentUser) : ControllerBase
{
    private const int MaxNoticeBytes = 64 * 1024;

    private Guid UserId => currentUser.RequireUserId();

    /// <summary>Creates a PayOS payment link (checkout page and VietQR) to buy credits.</summary>
    /// <remarks>
    /// The link expires after 15 minutes. Instead of opening checkoutUrl, the client can render qrCode (VietQR)
    /// with bankBin, accountNumber, accountName and transferNote in its own page, then poll
    /// GET topups/{paymentId}. Credits are added only when PayOS confirms the payment through the webhook.
    /// </remarks>
    /// <response code="200">The payment link.</response>
    /// <response code="400">Invalid input or INVALID_TOPUP_AMOUNT.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="409">PAYMENT_CONFLICT: retry.</response>
    /// <response code="503">PAYMENT_UNAVAILABLE or SESSION_CHECK_UNAVAILABLE.</response>
    [HttpPost("create-topup"), RequireSessionCheck]
    public async Task<IActionResult> CreateTopup(
        CreateTopupRequest r,
        [FromServices] ICommandHandler<CreateTopupCommand, TopupResponse> handler,
        CancellationToken ct
    )
    {
        var topup = await handler.HandleAsync(r.ToCommand(UserId), ct);
        return Ok(ApiResponse<TopupResponse>.Ok(topup));
    }

    /// <summary>Returns the status of one of the signed-in user's top-ups.</summary>
    /// <remarks>
    /// Poll every few seconds while the QR code is shown, until status is SUCCEEDED (then refresh the wallet) or
    /// expiresAt has passed.
    /// </remarks>
    /// <response code="200">The top-up status.</response>
    /// <response code="401">Missing, invalid or revoked access token.</response>
    /// <response code="404">PAYMENT_NOT_FOUND: unknown id or another user's payment.</response>
    [HttpGet("topups/{paymentId:guid}")]
    public async Task<IActionResult> GetTopup(
        Guid paymentId,
        [FromServices] IQueryHandler<GetTopupStatusQuery, TopupStatusResponse> handler,
        CancellationToken ct
    )
    {
        var topup = await handler.HandleAsync(new(UserId, paymentId), ct);
        return Ok(ApiResponse<TopupStatusResponse>.Ok(topup));
    }

    /// <summary>Receives PayOS payment notifications (called by PayOS, not by clients).</summary>
    /// <remarks>
    /// Authenticated by the HMAC signature in the body instead of a token. Repeated notifications are safe; unknown
    /// orders, such as PayOS's test notification when the webhook URL is registered, are acknowledged.
    /// </remarks>
    /// <response code="200">Processed or ignored.</response>
    /// <response code="400">INVALID_WEBHOOK_SIGNATURE.</response>
    /// <response code="409">PAYMENT_AMOUNT_MISMATCH: the paid amount differs from the order.</response>
    /// <response code="503">PAYMENT_UNAVAILABLE: the checksum key is not configured.</response>
    [HttpPost("webhook"), AllowAnonymous, RequestSizeLimit(MaxNoticeBytes)]
    public async Task<IActionResult> Webhook(
        [FromServices] ICommandHandler<HandlePaymentNoticeCommand> handler,
        CancellationToken ct
    )
    {
        // The signature covers the exact JSON, so the body is read raw instead of model-bound
        using var reader = new StreamReader(Request.Body);
        var body = await reader.ReadToEndAsync(ct);
        await handler.HandleAsync(new(body), ct);
        return Ok(ApiResponse.Message("OK"));
    }
}
