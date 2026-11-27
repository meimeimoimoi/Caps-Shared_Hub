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

    private static PayOsClient Lookup(string data) =>
        new(
            new HttpClient(
                new Reply("{\"code\": \"00\", \"desc\": \"success\", \"data\": {" + data + "}}")
            )
            {
                BaseAddress = new Uri("https://payos.test/"),
            },
            new PayOsOptions
            {
                ClientId = "id",
                ApiKey = "key",
                ChecksumKey = "checksum",
                ReturnUrl = "https://fe/ok",
                CancelUrl = "https://fe/cancel",
            },
            NullLogger<PayOsClient>.Instance
        );

    [Theory]
    [InlineData("PAID", 50_000, true)]
    [InlineData("PENDING", 0, false)]
    [InlineData("UNDERPAID", 20_000, false)]
    public async Task A_lookup_reports_paid_only_for_a_fully_paid_order(
        string status,
        long amountPaid,
        bool paid
    )
    {
        var notice = await Lookup(
                $$"""
                "id": "abc", "orderCode": {{Request.OrderCode}}, "amount": 50000,
                "amountPaid": {{amountPaid}}, "status": "{{status}}", "transactions": []
                """
            )
            .FindPaymentAsync(Request.OrderCode, CancellationToken.None);

        Assert.Equal(new PaymentNotice(Request.OrderCode, amountPaid, paid), notice);
    }

    [Fact]
    public async Task A_lookup_answering_for_another_order_gives_no_answer()
    {
        var e = await Assert.ThrowsAsync<Caps.Common.Domain.AppException>(() =>
            Lookup(""" "orderCode": 1, "amountPaid": 50000, "status": "PAID" """)
                .FindPaymentAsync(Request.OrderCode, CancellationToken.None)
        );

        Assert.Equal("PAYMENT_UNAVAILABLE", e.Code);
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
