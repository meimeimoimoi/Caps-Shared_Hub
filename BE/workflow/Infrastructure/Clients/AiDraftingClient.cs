using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using Microsoft.Extensions.Logging;

namespace Caps.Workflow.Infrastructure.Clients;

/// <summary>HTTP client adapter for generating document drafts via the Python AI service.</summary>
public sealed class AiDraftingClient(HttpClient httpClient, ILogger<AiDraftingClient> logger)
    : IAiDraftingClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private static readonly JsonElement EmptyObjectElement = JsonSerializer.SerializeToElement(
        new { }
    );
    private static readonly JsonElement EmptyArrayElement = JsonSerializer.SerializeToElement(
        Array.Empty<object>()
    );

    public async Task<AiDraftResponse> GenerateDraftAsync(
        AiDraftRequest request,
        CancellationToken ct = default
    )
    {
        JsonElement snapshotElement;
        try
        {
            using var snapshotDoc = JsonDocument.Parse(request.SnapshotDataJson);
            snapshotElement = snapshotDoc.RootElement.Clone();
        }
        catch (JsonException ex)
        {
            logger.LogError(
                ex,
                "Invalid snapshot JSON for document {DocumentId}",
                request.DocumentId
            );
            throw WorkflowErrors.DraftGenerationFailed();
        }

        var templateElement = EmptyObjectElement;
        if (!string.IsNullOrWhiteSpace(request.TemplateSchemaJson))
        {
            try
            {
                using var templateDoc = JsonDocument.Parse(request.TemplateSchemaJson);
                templateElement = templateDoc.RootElement.Clone();
            }
            catch (JsonException ex)
            {
                logger.LogWarning(
                    ex,
                    "Invalid template schema JSON for document {DocumentId}; falling back to empty schema",
                    request.DocumentId
                );
            }
        }

        var payload = new
        {
            document_id = request.DocumentId.ToString(),
            snapshot_data = snapshotElement,
            template_schema = templateElement,
            period_start = request.PeriodStart.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            period_end = request.PeriodEnd.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
        };

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsJsonAsync(
                "/api/v1/drafting/generate",
                payload,
                JsonOptions,
                ct
            );
        }
        catch (Exception ex)
            when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
        {
            logger.LogError(
                ex,
                "Failed to contact AI drafting service for document {DocumentId}",
                request.DocumentId
            );
            throw WorkflowErrors.DraftGenerationFailed();
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            logger.LogError(
                "AI drafting service returned HTTP {StatusCode} for document {DocumentId}: {ErrorBody}",
                (int)response.StatusCode,
                request.DocumentId,
                errorBody
            );
            throw WorkflowErrors.DraftGenerationFailed();
        }

        AiDraftRawResponse? result;
        try
        {
            result = await response.Content.ReadFromJsonAsync<AiDraftRawResponse>(JsonOptions, ct);
        }
        catch (JsonException ex)
        {
            logger.LogError(
                ex,
                "AI drafting service returned invalid JSON for document {DocumentId}",
                request.DocumentId
            );
            throw WorkflowErrors.DraftGenerationFailed();
        }

        if (
            result is null
            || result.Content.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null
        )
        {
            logger.LogError(
                "AI drafting service returned empty or null draft content for document {DocumentId}",
                request.DocumentId
            );
            throw WorkflowErrors.DraftGenerationFailed();
        }

        var citations =
            result.Citations.ValueKind is JsonValueKind.Array
                ? result.Citations
                : EmptyArrayElement;

        return new AiDraftResponse(
            result.Content,
            result.ContentHash ?? string.Empty,
            result.HasUnauthorizedNumbers,
            result.UnauthorizedNumbers ?? [],
            citations
        );
    }

    private sealed record AiDraftRawResponse(
        [property: JsonPropertyName("status")] string? Status,
        [property: JsonPropertyName("content")] JsonElement Content,
        [property: JsonPropertyName("content_hash")] string? ContentHash,
        [property: JsonPropertyName("has_unauthorized_numbers")] bool HasUnauthorizedNumbers,
        [property: JsonPropertyName("unauthorized_numbers")] List<string>? UnauthorizedNumbers,
        [property: JsonPropertyName("citations")] JsonElement Citations
    );
}
