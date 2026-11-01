using Caps.RagQuery.Dtos;
using Caps.RagQuery.Services.Interface;
using static Caps.RagQuery.Dtos.PythonAiDtos;
using static Caps.RagQuery.Dtos.RagQueryDtos;

namespace Caps.RagQuery.Services;

public class ChatAiClient : IChatAiClient
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ChatAiClient> _logger;

    public ChatAiClient(HttpClient httpClient, ILogger<ChatAiClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<RagQueryDtos.RagQueryResponse> QueryAsync(RagQueryDtos.RagQueryRequest request, CancellationToken cancellationToken = default)
    {
        var pythonRequest = new PythonAiDtos.PythonQueryRequest(
            Question: request.Question,
            UserTaxPeriod: request.UserTaxPeriod
            );

        _logger.LogInformation("Forwarding query to AI Service. TaxPeriod: {TaxPeriod}", request.UserTaxPeriod);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsJsonAsync("api/v1/chat/query", pythonRequest, cancellationToken);
        }
        catch(TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "Request to Python AI service timed out.");
            throw new HttpRequestException("AI service request timed out.", ex, System.Net.HttpStatusCode.GatewayTimeout);
        }
        catch(HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Python AI service.");
            throw;
        }

        if (!response.IsSuccessStatusCode)
        {
            var rawError = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("AI Service returned HTTP {StatusCode}: {ErrorBody}", response.StatusCode, rawError);
            throw new HttpRequestException(
                $"AI service error (HTTP {response.StatusCode}): {rawError}",
                null,
                response.StatusCode);
        }

        var pythonResponse = await response.Content.ReadFromJsonAsync<PythonQueryResponse>(cancellationToken);
        if (pythonResponse is null)
        {
            throw new InvalidOperationException("Received null response payload from Python AI service.");
        }

        // Map snake_case Python response to C# PascalCase response
        var citations = pythonResponse.Citations?.Select(c => new CitationDto(
            Article: c.Article,
            Clause: c.Clause,
            Point: c.Point,
            DocNumber: c.DocNumber,
            Text: c.Text,
            EffectiveFrom: c.EffectiveFrom,
            EffectiveTo: c.EffectiveTo
        )).ToList() ?? [];

        return new RagQueryResponse(
            ScopeResult: pythonResponse.ScopeResult,
            AnswerStatus: pythonResponse.AnswerStatus,
            PeriodStart: pythonResponse.PeriodStart,
            PeriodEnd: pythonResponse.PeriodEnd,
            Answer: pythonResponse.Answer,
            Citations: citations
        );
    }
}
