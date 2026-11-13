using System.Text.Json.Serialization;

namespace Caps.Workflow.Application.AiChat.DTOs;

/// <summary>DTOs for internal RAG query client communication.</summary>
public static class RagQueryClientDtos
{
    /// <summary>Internal RAG query request payload.</summary>
    public sealed record InternalRagQueryRequest(
        [property: JsonPropertyName("question")] string Question,
        [property: JsonPropertyName("user_tax_period")] string? UserTaxPeriod = null
    );

    /// <summary>Legal citation item returned by the internal RAG service.</summary>
    public sealed record InternalCitationDto(
        [property: JsonPropertyName("article")] string? Article,
        [property: JsonPropertyName("clause")] string? Clause,
        [property: JsonPropertyName("point")] string? Point,
        [property: JsonPropertyName("doc_number")] string? DocNumber,
        [property: JsonPropertyName("text")] string? Text,
        [property: JsonPropertyName("effective_from")] string? EffectiveFrom,
        [property: JsonPropertyName("effective_to")] string? EffectiveTo
    );

    /// <summary>Internal RAG query response payload.</summary>
    public sealed record InternalRagQueryResponse(
        [property: JsonPropertyName("scope_result")] string ScopeResult,
        [property: JsonPropertyName("answer_status")] string AnswerStatus,
        [property: JsonPropertyName("period_start")] string? PeriodStart,
        [property: JsonPropertyName("period_end")] string? PeriodEnd,
        [property: JsonPropertyName("answer")] string Answer,
        [property: JsonPropertyName("citations")] IReadOnlyList<InternalCitationDto>? Citations
    );
}
