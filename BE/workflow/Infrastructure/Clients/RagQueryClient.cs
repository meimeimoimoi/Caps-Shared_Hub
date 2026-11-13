using System.Net.Http.Json;
using System.Text.Json;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Exceptions;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Infrastructure.Clients;

/// <summary>HTTP client adapter for querying the internal RAG service.</summary>
public sealed class RagQueryClient(HttpClient httpClient) : IRagQueryClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<RagQueryResponse> QueryAsync(RagQueryRequest request, CancellationToken ct = default)
    {
        var question = string.IsNullOrWhiteSpace(request.Clarification)
            ? request.Query
            : $"{request.Query}\nClarification: {request.Clarification}";

        var userTaxPeriod = request.PeriodStart.HasValue || request.PeriodEnd.HasValue
            ? $"{request.PeriodStart:yyyy-MM-dd}..{request.PeriodEnd:yyyy-MM-dd}"
            : null;

        var payload = new
        {
            question,
            userTaxPeriod,
            conversation_id = request.ConversationId,
            query = request.Query,
            clarification = request.Clarification,
            period_start = request.PeriodStart?.ToString("yyyy-MM-dd"),
            period_end = request.PeriodEnd?.ToString("yyyy-MM-dd")
        };

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsJsonAsync("/api/v1/internal/rag/query", payload, JsonOptions, ct);
        }
        catch (Exception ex)
        {
            throw WorkflowErrors.RagQueryFailed($"Network or timeout error contacting RAG service: {ex.Message}");
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            throw WorkflowErrors.RagQueryFailed($"Status {(int)response.StatusCode}: {errorBody}");
        }

        var result = await response.Content.ReadFromJsonAsync<RagQueryRawResponse>(JsonOptions, ct);
        if (result is null)
        {
            throw WorkflowErrors.RagQueryFailed("Received empty response payload from RAG service.");
        }

        return new RagQueryResponse(
            result.Content ?? result.Answer ?? string.Empty,
            result.ScopeResult ?? "IN_SCOPE",
            result.AnswerStatus ?? "ANSWERED",
            result.PeriodStart,
            result.PeriodEnd,
            result.Citations ?? []
        );
    }

    private sealed record RagQueryRawResponse(
        string? Content,
        string? Answer,
        string? ScopeResult,
        string? AnswerStatus,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd,
        List<CitationDto>? Citations
    );
}
