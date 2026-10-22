using System.Net.Http.Json;
using System.Text.Json;
using Caps.Ingestion.Dtos;
using ingestion.Services.Interface;

namespace ingestion.Services;

public class AiServiceClient : IAiServiceClient
{
    private readonly HttpClient _httpClient;
    
    public AiServiceClient(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }
    public async Task<AiServiceDtos.AiIngestResponseDto> ChunkAndEmbedAsync(AiServiceDtos.AiIngestRequestDto req, CancellationToken cancellationToken = default)
    {
        var jsonOptions = new JsonSerializerOptions
        
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
        };

        var response = await _httpClient.PostAsJsonAsync("/api/v1/kb/chunk-and-embed", req, jsonOptions, cancellationToken);

        if  (!response.IsSuccessStatusCode)
        {
            var errContent = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException($"AI service returned {response.StatusCode}: {errContent}");
        }

        var result = await response.Content.ReadFromJsonAsync<AiServiceDtos.AiIngestResponseDto>(jsonOptions, cancellationToken);

        return result ?? throw new InvalidOperationException("Empty response from AI service");
    }
}
