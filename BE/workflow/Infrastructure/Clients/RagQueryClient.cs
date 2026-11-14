using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Exceptions;
using Microsoft.Extensions.Logging;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Infrastructure.Clients;

/// <summary>HTTP client adapter for querying the internal RAG service.</summary>
public sealed class RagQueryClient(HttpClient httpClient, ILogger<RagQueryClient> logger)
    : IRagQueryClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public async Task<RagQueryResponse> QueryAsync(
        RagQueryRequest request,
        CancellationToken ct = default
    )
    {
        var question = string.IsNullOrWhiteSpace(request.Clarification)
            ? request.Query
            : $"{request.Query}\nClarification: {request.Clarification}";

        var periodStartStr = request.PeriodStart?.ToString(
            "yyyy-MM-dd",
            CultureInfo.InvariantCulture
        );
        var periodEndStr = request.PeriodEnd?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        var userTaxPeriod =
            periodStartStr is not null || periodEndStr is not null
                ? $"{periodStartStr}..{periodEndStr}"
                : null;

        var payload = new
        {
            question,
            userTaxPeriod,
            conversation_id = request.ConversationId,
            query = request.Query,
            clarification = request.Clarification,
            period_start = periodStartStr,
            period_end = periodEndStr,
        };

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsJsonAsync(
                "/api/v1/internal/rag/query",
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
                "Failed to contact RAG query service for conversation {ConversationId}",
                request.ConversationId
            );
            throw WorkflowErrors.RagQueryFailed();
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            logger.LogError(
                "RAG query service returned HTTP {StatusCode} for conversation {ConversationId}: {ErrorBody}",
                (int)response.StatusCode,
                request.ConversationId,
                errorBody
            );
            throw WorkflowErrors.RagQueryFailed();
        }

        RagQueryRawResponse? result;
        try
        {
            result = await response.Content.ReadFromJsonAsync<RagQueryRawResponse>(JsonOptions, ct);
        }
        catch (JsonException ex)
        {
            logger.LogError(
                ex,
                "RAG query service returned invalid JSON for conversation {ConversationId}",
                request.ConversationId
            );
            throw WorkflowErrors.RagQueryFailed();
        }

        if (result is null)
        {
            logger.LogError(
                "RAG query service returned an empty payload for conversation {ConversationId}",
                request.ConversationId
            );
            throw WorkflowErrors.RagQueryFailed();
        }

        var content = result.Content ?? result.Answer;
        if (
            string.IsNullOrWhiteSpace(result.ScopeResult)
            || string.IsNullOrWhiteSpace(result.AnswerStatus)
            || string.IsNullOrWhiteSpace(content)
        )
        {
            logger.LogError(
                "RAG query service returned incomplete response for conversation {ConversationId}. ScopeResult='{ScopeResult}', AnswerStatus='{AnswerStatus}', HasContent={HasContent}",
                request.ConversationId,
                result.ScopeResult,
                result.AnswerStatus,
                !string.IsNullOrWhiteSpace(content)
            );
            throw WorkflowErrors.RagQueryFailed();
        }

        return new RagQueryResponse(
            content,
            result.ScopeResult,
            result.AnswerStatus,
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
