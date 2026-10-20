using System.Net;
using System.Text;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Infrastructure.Payments;
using Microsoft.Extensions.Logging.Abstractions;

namespace Caps.Billing.UnitTests;

public sealed class PayOsClientTests
{
    private const string Beneficiary = """
        "bin": "970422", "accountNumber": "113366668888", "accountName": "CONG TY CAPS",
        "description": "CSXXXXXX CAPS NAP",
        """;

    private static readonly PaymentLinkRequest Request = new(
        1792261576000123,
        50_000,
        "CAPS NAP",
        DateTimeOffset.UnixEpoch.AddYears(60)
    );

    private static PayOsClient Client(string data)
    {
        var json =
            "{\"code\": \"00\", \"desc\": \"success\", \"data\": {"
            + data
            + "\"checkoutUrl\": \"https://pay.payos.vn/web/abc\", \"qrCode\": \"000201...\", \"paymentLinkId\": \"abc\"}}";
        var http = new HttpClient(new Reply(json)) { BaseAddress = new Uri("https://payos.test/") };
        var options = new PayOsOptions
        {
            ClientId = "id",
            ApiKey = "key",
            ChecksumKey = "checksum",
            ReturnUrl = "https://fe/ok",
            CancelUrl = "https://fe/cancel",
        };
        return new PayOsClient(http, options, NullLogger<PayOsClient>.Instance);
    }

    [Fact]
    public async Task The_link_carries_the_receiving_account_and_transfer_note()
    {
        var link = await Client(Beneficiary).CreateLinkAsync(Request, CancellationToken.None);

        Assert.Equal("000201...", link.QrCode);
        Assert.Equal(
            new PaymentBeneficiary("970422", "113366668888", "CONG TY CAPS", "CSXXXXXX CAPS NAP"),
            link.Beneficiary
        );
    }

    [Fact]
    public async Task A_link_without_the_account_still_works_without_a_beneficiary()
    {
        var link = await Client("\"bin\": \"970422\",")
            .CreateLinkAsync(Request, CancellationToken.None);

        Assert.Equal("https://pay.payos.vn/web/abc", link.CheckoutUrl);
        Assert.Null(link.Beneficiary);
    }

    private sealed class Reply(string json) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken ct
        ) =>
            Task.FromResult(
                new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json"),
                }
            );
    }
}
