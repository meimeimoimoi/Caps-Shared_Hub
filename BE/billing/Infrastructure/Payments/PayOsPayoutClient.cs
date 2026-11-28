using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Common.Domain;
using Microsoft.Extensions.Logging;

namespace Caps.Billing.Infrastructure.Payments;

/// <summary>
/// PayOS payout (chi hộ) API over plain HTTP, with the payout channel's own keys. Anything that leaves the
/// outcome unknown surfaces as PAYMENT_UNAVAILABLE; the account number goes to PayOS only and is never logged.
/// </summary>
/// <remarks>
/// shortcut: the response x-signature is not verified (TLS already authenticates PayOS, and its canonical form is
/// JavaScript's JSON.stringify of nested data); verify it if PayOS documents that form.
/// </remarks>
public sealed class PayOsPayoutClient(
    HttpClient http,
    PayOsOptions options,
    ILogger<PayOsPayoutClient> logger
) : IPayoutGateway
{
    private const string SuccessCode = "00";

    public bool IsAvailable => options.CanSendPayouts;

    public async Task<PayoutSubmission> SubmitAsync(PayoutOrder order, CancellationToken ct)
    {
        if (!IsAvailable)
            throw BillingErrors.PaymentUnavailable();

        using var message = Request(HttpMethod.Post, "v1/payouts");
        message.Content = JsonContent.Create(
            new
            {
                referenceId = order.Reference,
                amount = order.Amount,
                description = order.Description,
                toBin = order.BankBin,
                toAccountNumber = order.AccountNumber,
            }
        );
        message.Headers.Add("x-idempotency-key", order.Reference);
        message.Headers.Add(
            "x-signature",
            PayOsSignature.ForFields(
                options.PayoutChecksumKey,
                [
                    new("referenceId", order.Reference),
                    new("amount", order.Amount.ToString(CultureInfo.InvariantCulture)),
                    new("description", order.Description),
                    new("toBin", order.BankBin),
                    new("toAccountNumber", order.AccountNumber),
                ]
            )
        );

        var (status, root) = await SendAsync(message, order.Reference, ct);
        if (status < HttpStatusCode.BadRequest && Code(root) == SuccessCode)
        {
            return
                root.TryGetProperty("data", out var data)
                && ReadReport(data, order.Reference) is { } report
                ? new PayoutSubmission(report, null)
                : throw Unknown(order.Reference, status, root);
        }
        // 5xx: PayOS may or may not have created it, so the attempt stays open for a refresh
        if (status >= HttpStatusCode.InternalServerError)
            throw Unknown(order.Reference, status, root);
        logger.LogWarning(
            "PayOS refused payout {Reference}: HTTP {Status}, code {Code}, {Desc}",
            order.Reference,
            (int)status,
            Code(root),
            Desc(root)
        );
        return new PayoutSubmission(null, $"{Code(root)}: {Desc(root)}");
    }

    public async Task<PayoutReport?> FindAsync(
        string? providerRef,
        string reference,
        CancellationToken ct
    )
    {
        if (!IsAvailable)
            throw BillingErrors.PaymentUnavailable();

        var path =
            providerRef != null
                ? $"v1/payouts/{Uri.EscapeDataString(providerRef)}"
                : $"v1/payouts?referenceId={Uri.EscapeDataString(reference)}&limit=1";
        using var message = Request(HttpMethod.Get, path);
        var (status, root) = await SendAsync(message, reference, ct);
        if (providerRef != null && status == HttpStatusCode.NotFound)
            return null;
        if (
            status >= HttpStatusCode.BadRequest
            || Code(root) != SuccessCode
            || !root.TryGetProperty("data", out var data)
        )
        {
            throw Unknown(reference, status, root);
        }
        if (providerRef != null)
            return ReadReport(data, reference) ?? throw Unknown(reference, status, root);

        if (
            data.ValueKind != JsonValueKind.Object
            || !data.TryGetProperty("payouts", out var list)
            || list.ValueKind != JsonValueKind.Array
        )
        {
            throw Unknown(reference, status, root);
        }
        // Only an empty list proves PayOS has no such transfer; a payout of another reference means the filter failed
        return list.GetArrayLength() == 0
            ? null
            : ReadReport(list[0], reference) ?? throw Unknown(reference, status, root);
    }

    public async Task<long?> GetBalanceAsync(CancellationToken ct)
    {
        if (!IsAvailable)
        {
            return null;
        }
        try
        {
            using var message = Request(HttpMethod.Get, "v1/payouts-account/balance");
            var (status, root) = await SendAsync(message, "balance", ct);
            if (status >= HttpStatusCode.BadRequest || Code(root) != SuccessCode)
            {
                return null;
            }
            // The docs sample sends the balance as a string; a number is accepted too
            return
                root.TryGetProperty("data", out var data)
                && data.ValueKind == JsonValueKind.Object
                && data.TryGetProperty("balance", out var b)
                ? b.ValueKind == JsonValueKind.Number
                    ? b.GetInt64()
                    : long.TryParse(
                        b.GetString(),
                        NumberStyles.Integer,
                        CultureInfo.InvariantCulture,
                        out var v
                    )
                        ? v
                        : null
                : null;
        }
        catch (AppException)
        {
            // SendAsync throws PAYMENT_UNVAILABLE when PayOs cannot be reached: the balance is unknow
            return null;
        }
    }

    /// <summary>
    /// Maps a PayOS payout to a PayoutStatus: its single transaction's state, or a rejected approval. Null when it
    /// is malformed or belongs to another reference.
    /// </summary>
    private static PayoutReport? ReadReport(JsonElement payout, string reference)
    {
        if (
            payout.ValueKind != JsonValueKind.Object
            || Text(payout, "id") is not { } id
            || Text(payout, "referenceId") != reference
        )
        {
            return null;
        }
        var approval = Text(payout, "approvalState");
        JsonElement? transaction =
            payout.TryGetProperty("transactions", out var list)
            && list.ValueKind == JsonValueKind.Array
            && list.GetArrayLength() > 0
                ? list[0]
                : null;
        var state = transaction is { } t ? Text(t, "state") : null;

        var status =
            state == "SUCCEEDED" ? PayoutStatus.Succeeded
            : state is "FAILED" or "CANCELLED" or "REVERSED"
            || approval is "REJECTED" or "CANCELLED" or "FAILED"
                ? PayoutStatus.Failed
            : PayoutStatus.Processing;
        var error =
            status != PayoutStatus.Failed
                ? null
                : (transaction is { } f ? Text(f, "errorMessage") : null) ?? state ?? approval;
        return new PayoutReport(id, status, error);
    }

    private HttpRequestMessage Request(HttpMethod method, string path)
    {
        var message = new HttpRequestMessage(method, path);
        message.Headers.Add("x-client-id", options.PayoutClientId);
        message.Headers.Add("x-api-key", options.PayoutApiKey);
        return message;
    }

    private async Task<(HttpStatusCode Status, JsonElement Root)> SendAsync(
        HttpRequestMessage message,
        string reference,
        CancellationToken ct
    )
    {
        try
        {
            using var response = await http.SendAsync(message, ct);
            using var json = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(ct),
                cancellationToken: ct
            );
            return (response.StatusCode, json.RootElement.Clone());
        }
        catch (Exception e)
            when (e is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(e, "PayOS payout call failed for {Reference}", reference);
            throw BillingErrors.PaymentUnavailable();
        }
    }

    private AppException Unknown(string reference, HttpStatusCode status, JsonElement root)
    {
        logger.LogWarning(
            "PayOS payout {Reference} outcome unknown: HTTP {Status}, code {Code}, {Desc}",
            reference,
            (int)status,
            Code(root),
            Desc(root)
        );
        return BillingErrors.PaymentUnavailable();
    }

    private static string? Text(JsonElement element, string name) =>
        element.ValueKind == JsonValueKind.Object
        && element.TryGetProperty(name, out var v)
        && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static string? Code(JsonElement root) => Text(root, "code");

    private static string? Desc(JsonElement root) => Text(root, "desc");
}
