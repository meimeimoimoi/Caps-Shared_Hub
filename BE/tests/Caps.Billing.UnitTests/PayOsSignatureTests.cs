using System.Text.Json;
using Caps.Billing.Infrastructure.Payments;

namespace Caps.Billing.UnitTests;

/// <summary>Expected values were computed independently with Python's hmac module.</summary>
public sealed class PayOsSignatureTests
{
    private const string Key = "test-checksum-key";

    [Fact]
    public void Payment_request_signs_the_five_fields_in_alphabetical_order() =>
        Assert.Equal(
            "e9240c5fe2ff3e5ee2af0879395f83649b288c46a0b06614cba3b805db818309",
            PayOsSignature.ForPaymentRequest(
                Key,
                50000,
                "https://fe/cancel",
                "CAPS NAP",
                1792261576000123,
                "https://fe/ok"
            )
        );

    [Fact]
    public void Webhook_data_is_signed_with_sorted_keys_and_null_as_empty()
    {
        // Keys deliberately out of order; null must sign as an empty value
        using var json = JsonDocument.Parse(
            """
            {
              "orderCode": 1792261576000123,
              "amount": 50000,
              "description": "CAPS NAP",
              "accountNumber": "12345678",
              "reference": "FT123",
              "transactionDateTime": "2026-10-18 10:00:00",
              "code": "00",
              "desc": "success",
              "counterAccountName": null
            }
            """
        );

        Assert.Equal(
            "1c72558db8726fe76e7e866f964b061e27c50d9ba648cfa306c5763869eca23c",
            PayOsSignature.ForData(Key, json.RootElement)
        );
    }

    [Theory]
    [InlineData("1C72558DB8726FE76E7E866F964B061E27C50D9BA648CFA306C5763869ECA23C", true)]
    [InlineData("1c72558db8726fe76e7e866f964b061e27c50d9ba648cfa306c5763869eca23d", false)]
    [InlineData("1c72", false)]
    [InlineData(null, false)]
    public void Signatures_match_only_exactly_ignoring_case(string? actual, bool matches) =>
        Assert.Equal(
            matches,
            PayOsSignature.Matches(
                "1c72558db8726fe76e7e866f964b061e27c50d9ba648cfa306c5763869eca23c",
                actual
            )
        );
}
