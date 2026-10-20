using System.Net.Http.Json;
using System.Text.Json;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Microsoft.Extensions.Logging;

namespace Caps.Billing.Infrastructure.Payments;

/// <summary>
/// PayOS merchant API over plain HTTP (no SDK): creates payment links and verifies webhook signatures.
/// Provider failures are logged here and surface as PAYMENT_UNAVAILABLE, without provider details.
/// </summary>
public sealed class PayOsClient(HttpClient http, PayOsOptions options, ILogger<PayOsClient> logger)
    : IPaymentGateway
{
    private const string SuccessCode = "00";

    public async Task<PaymentLink> CreateLinkAsync(PaymentLinkRequest request, CancellationToken ct)
    {
        if (!options.CanCreateLinks)
            throw BillingErrors.PaymentUnavailable();

        var body = new
        {
            orderCode = request.OrderCode,
            amount = request.Amount,
            description = request.Description,
            returnUrl = options.ReturnUrl,
            cancelUrl = options.CancelUrl,
            expiredAt = request.ExpiresAt.ToUnixTimeSeconds(),
            signature = PayOsSignature.ForPaymentRequest(
                options.ChecksumKey,
                request.Amount,
                options.CancelUrl,
                request.Description,
                request.OrderCode,
                options.ReturnUrl
            ),
        };
        using var message = new HttpRequestMessage(HttpMethod.Post, "v2/payment-requests")
        {
            Content = JsonContent.Create(body),
        };
        message.Headers.Add("x-client-id", options.ClientId);
        message.Headers.Add("x-api-key", options.ApiKey);

        try
        {
            using var response = await http.SendAsync(message, ct);
            using var json = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(ct),
                cancellationToken: ct
            );
            var root = json.RootElement;
            var code = root.TryGetProperty("code", out var c) ? c.GetString() : null;
            if (
                !response.IsSuccessStatusCode
                || code != SuccessCode
                || !root.TryGetProperty("data", out var data)
                || data.ValueKind != JsonValueKind.Object
            )
            {
                logger.LogWarning(
                    "PayOS refused order {OrderCode}: HTTP {Status}, code {Code}, {Desc}",
                    request.OrderCode,
                    (int)response.StatusCode,
                    code,
                    root.TryGetProperty("desc", out var d) ? d.GetString() : null
                );
                throw BillingErrors.PaymentUnavailable();
            }
            return new PaymentLink(
                data.GetProperty("checkoutUrl").GetString()!,
                data.GetProperty("qrCode").GetString()!,
                data.GetProperty("paymentLinkId").GetString()!,
                ReadBeneficiary(data)
            );
        }
        catch (Exception e)
            when (e
                    is HttpRequestException
                        or TaskCanceledException
                        or JsonException
                        or KeyNotFoundException
                        or InvalidOperationException
            )
        {
            logger.LogWarning(e, "PayOS call failed for order {OrderCode}", request.OrderCode);
            throw BillingErrors.PaymentUnavailable();
        }
    }

    // Optional: without it the client can still use the QR code or the checkout page
    private static PaymentBeneficiary? ReadBeneficiary(JsonElement data)
    {
        string? Text(string name) =>
            data.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String
                ? v.GetString()
                : null;

        var bin = Text("bin");
        var accountNumber = Text("accountNumber");
        var accountName = Text("accountName");
        var description = Text("description");
        return bin is null || accountNumber is null || accountName is null || description is null
            ? null
            : new PaymentBeneficiary(bin, accountNumber, accountName, description);
    }

    public PaymentNotice ReadNotice(string body)
    {
        if (!options.CanVerifyNotices)
            throw BillingErrors.PaymentUnavailable();
        try
        {
            using var json = JsonDocument.Parse(body);
            var root = json.RootElement;
            if (
                !root.TryGetProperty("data", out var data)
                || data.ValueKind != JsonValueKind.Object
                || !root.TryGetProperty("signature", out var signature)
                || !PayOsSignature.Matches(
                    PayOsSignature.ForData(options.ChecksumKey, data),
                    signature.GetString()
                )
            )
            {
                throw BillingErrors.InvalidWebhookSignature();
            }
            // Paid only when both the envelope and the transaction report success
            var paid =
                root.TryGetProperty("code", out var code)
                && code.GetString() == SuccessCode
                && data.TryGetProperty("code", out var dataCode)
                && dataCode.GetString() == SuccessCode;
            return new PaymentNotice(
                data.GetProperty("orderCode").GetInt64(),
                data.GetProperty("amount").GetInt64(),
                paid
            );
        }
        catch (Exception e)
            when (e
                    is JsonException
                        or KeyNotFoundException
                        or InvalidOperationException
                        or FormatException
            )
        {
            throw BillingErrors.InvalidWebhookSignature();
        }
    }
}
