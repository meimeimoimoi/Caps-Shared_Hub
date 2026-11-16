using System.Net;
using System.Text;
using System.Text.Json;
using Caps.Ingestion.Services;
using static Caps.Ingestion.Dtos.AiServiceDtos;

namespace Caps.Ingestion.UnitTests;

public sealed class AiServiceClientTests
{
    [Fact]
    public async Task Chunk_and_embed_posts_snake_case_payload_and_reads_response()
    {
        var handler = new RecordingHandler(
            HttpStatusCode.OK,
            """
            {
              "status": "SUCCESS",
              "total_chunks": 1,
              "kb_chunks": [
                {
                  "chunk_index": 0,
                  "qdrant_point_id": "pt-1",
                  "article": "Dieu 1",
                  "effective_from": "2024-01-01"
                }
              ]
            }
            """
        );
        var client = new AiServiceClient(
            new HttpClient(handler) { BaseAddress = new Uri("https://ai.test") }
        );

        var result = await client.ChunkAndEmbedAsync(
            new AiIngestRequestDto
            {
                KnowledgeDocumentId = "doc-1",
                LegalSourceId = "src-1",
                DocumentNumber = "78/2014/TT-BTC",
                Title = "Tax guide",
                EffectiveFrom = "2024-01-01",
            }
        );

        Assert.Equal(HttpMethod.Post, handler.LastMethod);
        Assert.Equal("/api/v1/kb/chunk-and-embed", handler.LastPath);
        Assert.Contains("\"knowledge_document_id\":\"doc-1\"", handler.LastBody);
        Assert.Equal(1, result.TotalChunks);
        Assert.Equal("pt-1", Assert.Single(result.KbChunks).QdrantPointId);
    }

    [Fact]
    public async Task Delete_document_vectors_calls_delete_endpoint_and_returns_count()
    {
        var docId = Guid.NewGuid();
        var handler = new RecordingHandler(
            HttpStatusCode.OK,
            $$"""
            {
              "status": "SUCCESS",
              "knowledge_document_id": "{{docId}}",
              "deleted_count": 5
            }
            """
        );
        var client = new AiServiceClient(
            new HttpClient(handler) { BaseAddress = new Uri("https://ai.test") }
        );

        var result = await client.DeleteDocumentVectorsAsync(docId);

        Assert.Equal(HttpMethod.Delete, handler.LastMethod);
        Assert.Equal($"/api/v1/kb/documents/{docId}", handler.LastPath);
        Assert.Equal(5, result.DeletedCount);
    }

    [Fact]
    public async Task Update_metadata_sends_only_specified_fields_and_supports_explicit_null_effective_to()
    {
        var docId = Guid.NewGuid();
        var handler = new RecordingHandler(
            HttpStatusCode.OK,
            $$"""
            {
              "status": "SUCCESS",
              "knowledge_document_id": "{{docId}}",
              "matched_count": 3
            }
            """
        );
        var client = new AiServiceClient(
            new HttpClient(handler) { BaseAddress = new Uri("https://ai.test") }
        );

        var result = await client.UpdateDocumentMetadataAsync(
            docId,
            new AiUpdateMetadataRequestDto(
                EffectiveFrom: null,
                EffectiveTo: null,
                ClearEffectiveTo: true,
                Status: "EXPIRED"
            )
        );

        Assert.Equal(HttpMethod.Patch, handler.LastMethod);
        Assert.Equal($"/api/v1/kb/documents/{docId}/metadata", handler.LastPath);
        Assert.Equal(3, result.MatchedCount);

        using var json = JsonDocument.Parse(handler.LastBody!);
        Assert.False(json.RootElement.TryGetProperty("effective_from", out _));
        Assert.True(json.RootElement.TryGetProperty("effective_to", out var effTo));
        Assert.Equal(JsonValueKind.Null, effTo.ValueKind);
        Assert.Equal("EXPIRED", json.RootElement.GetProperty("status").GetString());
    }

    [Fact]
    public async Task Non_success_response_throws_http_request_exception_with_status_code()
    {
        var docId = Guid.NewGuid();
        var handler = new RecordingHandler(HttpStatusCode.NotFound, "{\"detail\":\"missing\"}");
        var client = new AiServiceClient(
            new HttpClient(handler) { BaseAddress = new Uri("https://ai.test") }
        );

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.UpdateDocumentMetadataAsync(
                docId,
                new AiUpdateMetadataRequestDto(Status: "EXPIRED")
            )
        );

        Assert.Equal(HttpStatusCode.NotFound, ex.StatusCode);
    }

    private sealed class RecordingHandler(HttpStatusCode statusCode, string responseJson)
        : HttpMessageHandler
    {
        public HttpMethod? LastMethod { get; private set; }
        public string? LastPath { get; private set; }
        public string? LastBody { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            LastMethod = request.Method;
            LastPath = request.RequestUri?.PathAndQuery;
            LastBody = request.Content is null
                ? null
                : await request.Content.ReadAsStringAsync(cancellationToken);

            return new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json"),
            };
        }
    }
}
