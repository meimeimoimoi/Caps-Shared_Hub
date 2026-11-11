using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.AiChat.DTOs;
using Caps.Workflow.Application.AiChat.Interface;
using Caps.Workflow.Domain.Exceptions;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;
using IRagQueryClient = Caps.Workflow.Application.Abstractions.IRagQueryClient;

namespace Caps.Workflow.Infrastructure.Clients;
public sealed class RagQueryClient(HttpClient httpClient) : IRagQueryClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public async Task<RagQueryResponse> QueryAsync(RagQueryRequest request, CancellationToken ct = default)
    {
        var payload = new
        {
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
        if(result is null)
        {
            throw WorkflowErrors.RagQueryFailed("Received empty response payload from RAG service.");
        }

        return new RagQueryResponse(
            result.Content ?? string.Empty,
            result.ScopeResult ?? "IN_SCOPE",
            result.AnswerStatus ?? "ANSWERED",
            result.PeriodStart,
            result.PeriodEnd,
            result.Citations ?? []
            );

    }

    private sealed record RagQueryRawResponse(
        string? Content,
        string? ScopeResult,
        string? AnswerStatus,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd,
        List<CitationDto>? Citations
        );
}
