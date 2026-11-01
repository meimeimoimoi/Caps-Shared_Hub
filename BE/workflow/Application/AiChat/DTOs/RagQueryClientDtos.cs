using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.AiChat.DTOs;
public class RagQueryClientDtos
{
    public sealed record InternalRagQueryRequest(
        [property: JsonPropertyName("question")] string Question,
        [property: JsonPropertyName("user_tax_period")] string? UserTaxPeriod = null
    );

    public sealed record InternalCitationDto(
        [property: JsonPropertyName("article")] string? Article,
        [property: JsonPropertyName("clause")] string? Clause,
        [property: JsonPropertyName("point")] string? Point,
        [property: JsonPropertyName("doc_number")] string? DocNumber,
        [property: JsonPropertyName("text")] string? Text,
        [property: JsonPropertyName("effective_from")] string? EffectiveFrom,
        [property: JsonPropertyName("effective_to")] string? EffectiveTo
    );

    public sealed record InternalRagQueryResponse(
        [property: JsonPropertyName("scope_result")] string ScopeResult,
        [property: JsonPropertyName("answer_status")] string AnswerStatus,
        [property: JsonPropertyName("period_start")] string? PeriodStart,
        [property: JsonPropertyName("period_end")] string? PeriodEnd,
        [property: JsonPropertyName("answer")] string Answer,
        [property: JsonPropertyName("citations")] IReadOnlyList<InternalCitationDto>? Citations
    );
}
