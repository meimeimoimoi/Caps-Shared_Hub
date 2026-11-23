using System.Text.Json;
using System.Text.Json.Nodes;
using Caps.Ingestion.Dtos;
using ingestion.Services.Interfaces;

namespace Caps.Ingestion.Services;

/// <summary>HTTP client communicating with the Python ai-service KB endpoints.</summary>
public class AiServiceClient(HttpClient httpClient) : IAiServiceClient
{
    private static readonly JsonSerializerOptions SnakeCaseJson = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    public async Task<AiServiceDtos.AiIngestResponseDto> ChunkAndEmbedAsync(
        AiServiceDtos.AiIngestRequestDto req,
        CancellationToken cancellationToken = default
    )
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/v1/kb/chunk-and-embed",
            req,
            SnakeCaseJson,
            cancellationToken
        );
        return await ReadResponseAsync<AiServiceDtos.AiIngestResponseDto>(
            response,
            cancellationToken
        );
    }

    public async Task<AiServiceDtos.AiDeleteVectorsResponseDto> DeleteDocumentVectorsAsync(
        Guid knowledgeDocumentId,
        CancellationToken cancellationToken = default
    )
    {
        var response = await httpClient.DeleteAsync(
            $"/api/v1/kb/documents/{knowledgeDocumentId}",
            cancellationToken
        );
        return await ReadResponseAsync<AiServiceDtos.AiDeleteVectorsResponseDto>(
            response,
            cancellationToken
        );
    }

    public async Task<AiServiceDtos.AiUpdateMetadataResponseDto> UpdateDocumentMetadataAsync(
        Guid knowledgeDocumentId,
        AiServiceDtos.AiUpdateMetadataRequestDto req,
        CancellationToken cancellationToken = default
    )
    {
        // Only include fields explicitly modified so ai-service's model_fields_set ignores untouched properties.
        var payload = new JsonObject();
        if (req.EffectiveFrom is not null)
        {
            payload["effective_from"] = req.EffectiveFrom;
        }

        if (req.ClearEffectiveTo)
        {
            payload["effective_to"] = null;
        }
        else if (req.EffectiveTo is not null)
        {
            payload["effective_to"] = req.EffectiveTo;
        }

        if (req.Status is not null)
        {
            payload["status"] = req.Status;
        }

        using var content = JsonContent.Create(payload);
        var response = await httpClient.PatchAsync(
            $"/api/v1/kb/documents/{knowledgeDocumentId}/metadata",
            content,
            cancellationToken
        );
        return await ReadResponseAsync<AiServiceDtos.AiUpdateMetadataResponseDto>(
            response,
            cancellationToken
        );
    }

    private static async Task<T> ReadResponseAsync<T>(
        HttpResponseMessage response,
        CancellationToken cancellationToken
    )
    {
        if (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"AI service returned {(int)response.StatusCode} ({response.StatusCode}): {errContent}",
                null,
                response.StatusCode
            );
        }

        var result = await response.Content.ReadFromJsonAsync<T>(SnakeCaseJson, cancellationToken);
        return result ?? throw new InvalidOperationException("Empty response from AI service");
    }
}
