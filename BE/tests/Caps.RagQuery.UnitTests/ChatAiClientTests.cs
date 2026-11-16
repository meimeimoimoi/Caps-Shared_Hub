using System.Net;
using System.Text;
using System.Text.Json;
using Caps.Common.Security;
using Caps.RagQuery.Services;
using Microsoft.Extensions.Logging.Abstractions;
using static Caps.RagQuery.Dtos.RagQueryDtos;

namespace Caps.RagQuery.UnitTests;

public sealed class ChatAiClientTests
{
    [Fact]
    public async Task Query_posts_snake_case_payload_preserves_internal_key_and_maps_citations()
    {
        var handler = new StubHandler(
            HttpStatusCode.OK,
            """
            {
              "scope_result": "IN_SCOPE",
              "answer_status": "ANSWERED",
              "period_start": "2026-01-01",
              "period_end": "2026-03-31",
              "answer": "Thue TNDN ap dung theo Dieu 1.",
              "citations": [
                {
                  "article": "Dieu 1",
                  "clause": "Khoan 2",
                  "point": null,
                  "document_number": "78/2014/TT-BTC",
                  "doc_title": null,
                  "text": "Noi dung trich dan",
                  "effective_from": "2014-08-02",
                  "effective_to": null
                }
              ]
            }
            """
        );
        var http = new HttpClient(handler) { BaseAddress = new Uri("https://ai.test") };
        http.DefaultRequestHeaders.Add(RequireInternalKeyAttribute.Header, "secret-key");
        var client = new ChatAiClient(http, NullLogger<ChatAiClient>.Instance);

        var response = await client.QueryAsync(new RagQueryRequest("Thue TNDN?", "Q1 2026"));

        Assert.Equal("/api/v1/chat/query", handler.LastPath);
        Assert.Equal("secret-key", handler.LastInternalKey);
        using var sentJson = JsonDocument.Parse(handler.LastBody!);
        Assert.Equal("Thue TNDN?", sentJson.RootElement.GetProperty("question").GetString());
        Assert.Equal("Q1 2026", sentJson.RootElement.GetProperty("user_tax_period").GetString());

        Assert.Equal("IN_SCOPE", response.ScopeResult);
        Assert.Equal("ANSWERED", response.AnswerStatus);
        var citation = Assert.Single(response.Citations);
        Assert.Equal("78/2014/TT-BTC", citation.DocNumber);
        Assert.Equal("78/2014/TT-BTC", citation.DocTitle);
        Assert.Equal("2014-08-02", citation.EffectiveFrom);
    }

    [Fact]
    public async Task Query_maps_timeout_to_gateway_timeout_http_exception()
    {
        var handler = new StubHandler(throwTimeout: true);
        var client = new ChatAiClient(
            new HttpClient(handler) { BaseAddress = new Uri("https://ai.test") },
            NullLogger<ChatAiClient>.Instance
        );

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.QueryAsync(new RagQueryRequest("Thue VAT?"))
        );

        Assert.Equal(HttpStatusCode.GatewayTimeout, ex.StatusCode);
    }

    [Fact]
    public async Task Query_throws_invalid_operation_when_ai_payload_is_incomplete()
    {
        var handler = new StubHandler(
            HttpStatusCode.OK,
            """{"scope_result":"IN_SCOPE","answer_status":"ANSWERED","answer":""}"""
        );
        var client = new ChatAiClient(
            new HttpClient(handler) { BaseAddress = new Uri("https://ai.test") },
            NullLogger<ChatAiClient>.Instance
        );

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.QueryAsync(new RagQueryRequest("Thue VAT?"))
        );
    }

    private sealed class StubHandler(
        HttpStatusCode statusCode = HttpStatusCode.OK,
        string responseJson = "{}",
        bool throwTimeout = false
    ) : HttpMessageHandler
    {
        public string? LastPath { get; private set; }
        public string? LastBody { get; private set; }
        public string? LastInternalKey { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            LastPath = request.RequestUri?.PathAndQuery;
            LastBody = request.Content is null
                ? null
                : await request.Content.ReadAsStringAsync(cancellationToken);
            if (request.Headers.TryGetValues(RequireInternalKeyAttribute.Header, out var values))
            {
                LastInternalKey = values.FirstOrDefault();
            }

            if (throwTimeout)
            {
                throw new TaskCanceledException("Simulated HTTP client timeout");
            }

            return new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json"),
            };
        }
    }
}
