using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Caps.Billing.Infrastructure.Payments;

/// <summary>
/// PayOS signatures: HMAC-SHA256 with the checksum key over "key=value" pairs joined by "&amp;", as lower-case hex.
/// </summary>
public static class PayOsSignature
{
    /// <summary>Signature of a create-payment-link request: exactly these five fields, in alphabetical order.</summary>
    public static string ForPaymentRequest(
        string checksumKey,
        long amount,
        string cancelUrl,
        string description,
        long orderCode,
        string returnUrl
    ) =>
        Sign(
            checksumKey,
            string.Create(
                CultureInfo.InvariantCulture,
                $"amount={amount}&cancelUrl={cancelUrl}&description={description}&orderCode={orderCode}&returnUrl={returnUrl}"
            )
        );

    /// <summary>
    /// Signature of a webhook's <c>data</c> object: every property sorted by name (ordinal, as JavaScript sorts
    /// keys), null as an empty value, numbers and booleans as written in the JSON.
    /// </summary>
    public static string ForData(string checksumKey, JsonElement data)
    {
        var pairs = data.EnumerateObject()
            .OrderBy(p => p.Name, StringComparer.Ordinal)
            .Select(p => $"{p.Name}={ValueOf(p.Value)}");
        return Sign(checksumKey, string.Join('&', pairs));
    }

    /// <summary>Constant-time comparison, so response timing reveals nothing about the expected signature.</summary>
    public static bool Matches(string expected, string? actual) =>
        actual != null
        && CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected),
            Encoding.ASCII.GetBytes(actual.ToLowerInvariant())
        );

    private static string ValueOf(JsonElement value) =>
        value.ValueKind switch
        {
            JsonValueKind.Null or JsonValueKind.Undefined => "",
            JsonValueKind.String => value.GetString() is "null" or "undefined"
                ? ""
                : value.GetString()!,
            _ => value.GetRawText(),
        };

    private static string Sign(string checksumKey, string payload)
    {
        var hash = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(checksumKey),
            Encoding.UTF8.GetBytes(payload)
        );
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
