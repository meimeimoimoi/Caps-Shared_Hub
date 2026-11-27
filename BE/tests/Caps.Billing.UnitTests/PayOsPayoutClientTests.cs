using System.Net;
using System.Text;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Billing.Infrastructure.Payments;
using Caps.Common.Domain;
using Microsoft.Extensions.Logging.Abstractions;

namespace Caps.Billing.UnitTests;

public sealed class PayOsPayoutClientTests
{
    private const string Reference = "0190b2c4e1f87a3c9d2e5f6a7b8c9d0e-1";

    private static readonly PayoutOrder Order = new(
        Reference,
        450_000,
        "CAPS chi tra (chuyen gia)! *'",
        "970422",
        "0123456789"
    );

    private static string Payout(string reference, string approval, string state) =>
        $$"""
            {"id": "po_1", "referenceId": "{{reference}}", "approvalState": "{{approval}}",
             "transactions": [{"id": "tx_1", "state": "{{state}}", "errorMessage": "Tài khoản không tồn tại"}]}
            """;

    private static (PayOsPayoutClient Client, Reply Reply) Client(
        HttpStatusCode status,
        string json
    )
    {
        var reply = new Reply(status, json);
        var http = new HttpClient(reply) { BaseAddress = new Uri("https://payos.test/") };
        var options = new PayOsOptions
        {
            PayoutClientId = "payout-id",
            PayoutApiKey = "payout-key",
            PayoutChecksumKey = "checksum",
        };
        return (
            new PayOsPayoutClient(http, options, NullLogger<PayOsPayoutClient>.Instance),
            reply
        );
    }

    [Fact]
    public async Task A_transfer_is_signed_with_the_payout_keys_and_its_reference_as_idempotency_key()
    {
        var (client, reply) = Client(
            HttpStatusCode.OK,
            $$"""{"code": "00", "desc": "success", "data": {{Payout(Reference, "APPROVED", "SUCCEEDED")}}}"""
        );

        var submission = await client.SubmitAsync(Order, default);

        Assert.Equal(new PayoutReport("po_1", PayoutStatus.Succeeded, null), submission.Accepted);
        var request = reply.Request!;
        Assert.Equal("https://payos.test/v1/payouts", request.RequestUri!.ToString());
        Assert.Equal("payout-id", request.Headers.GetValues("x-client-id").Single());
        Assert.Equal("payout-key", request.Headers.GetValues("x-api-key").Single());
        Assert.Equal(Reference, request.Headers.GetValues("x-idempotency-key").Single());
        // Same fields as the SDK vector in PayOsSignatureTests
        Assert.Equal(
            "6fcba2fcf22d25912c581a6c7be965fb8b3cebcc9e6fc7eae6cc2048cb6bc732",
            request.Headers.GetValues("x-signature").Single()
        );
    }

    [Fact]
    public async Task A_client_error_is_a_refusal_with_the_payos_reason()
    {
        var (client, _) = Client(
            HttpStatusCode.BadRequest,
            """{"code": "232", "desc": "Số dư không đủ", "data": null}"""
        );

        var submission = await client.SubmitAsync(Order, default);

        Assert.Null(submission.Accepted);
        Assert.Equal("232: Số dư không đủ", submission.Refusal);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError, """{"code": "500", "desc": "error"}""")]
    [InlineData(HttpStatusCode.OK, """{"code": "00", "desc": "success", "data": {"id": "po_1"}}""")]
    [InlineData(HttpStatusCode.OK, "<html>")]
    public async Task An_unclear_answer_leaves_the_outcome_unknown(
        HttpStatusCode status,
        string json
    )
    {
        var (client, _) = Client(status, json);

        var error = await Assert.ThrowsAsync<AppException>(() =>
            client.SubmitAsync(Order, default)
        );

        Assert.Equal("PAYMENT_UNAVAILABLE", error.Code);
    }

    [Fact]
    public async Task Lookup_by_reference_maps_a_failed_transaction_with_its_reason()
    {
        var (client, reply) = Client(
            HttpStatusCode.OK,
            $$$"""{"code": "00", "desc": "success", "data": {"payouts": [{{{Payout(Reference, "COMPLETED", "FAILED")}}}]}}"""
        );

        var report = await client.FindAsync(null, Reference, default);

        Assert.Equal(
            new PayoutReport("po_1", PayoutStatus.Failed, "Tài khoản không tồn tại"),
            report
        );
        Assert.Equal(
            $"https://payos.test/v1/payouts?referenceId={Reference}&limit=1",
            reply.Request!.RequestUri!.ToString()
        );
    }

    [Fact]
    public async Task Only_an_empty_lookup_means_payos_never_received_it()
    {
        var (empty, _) = Client(
            HttpStatusCode.OK,
            """{"code": "00", "desc": "success", "data": {"payouts": []}}"""
        );
        Assert.Null(await empty.FindAsync(null, Reference, default));

        var (other, _) = Client(
            HttpStatusCode.OK,
            $$$"""{"code": "00", "desc": "success", "data": {"payouts": [{{{Payout("other-1", "PROCESSING", "PROCESSING")}}}]}}"""
        );
        Assert.Equal(
            "PAYMENT_UNAVAILABLE",
            (
                await Assert.ThrowsAsync<AppException>(() =>
                    other.FindAsync(null, Reference, default)
                )
            ).Code
        );
    }

    private sealed class Reply(HttpStatusCode status, string json) : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken ct
        )
        {
            Request = request;
            return Task.FromResult(
                new HttpResponseMessage(status)
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json"),
                }
            );
        }
    }
}
