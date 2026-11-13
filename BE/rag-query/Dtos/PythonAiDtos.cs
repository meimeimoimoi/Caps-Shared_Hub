using System.Text.Json.Serialization;

namespace Caps.RagQuery.Dtos;

public class PythonAiDtos
{
    /// <summary>
    /// Payload sent to the Python AI service (snake_case).
    /// </summary>
    public sealed record PythonQueryRequest(
        [property: JsonPropertyName("question")] string Question,
        [property: JsonPropertyName("user_tax_period")] string? UserTaxPeriod
    );

    /// <summary>
    /// Citation item returned by the Python AI service.
    /// </summary>
    public sealed record PythonCitationDto(
        [property: JsonPropertyName("article")] string? Article,
        [property: JsonPropertyName("clause")] string? Clause,
        [property: JsonPropertyName("point")] string? Point,
        [property: JsonPropertyName("doc_number")] string? DocNumber,
        [property: JsonPropertyName("text")] string? Text,
        [property: JsonPropertyName("effective_from")] string? EffectiveFrom,
        [property: JsonPropertyName("effective_to")] string? EffectiveTo
    );

    /// <summary>
    /// Response returned by the Python AI service (snake_case).
    /// </summary>
    public sealed record PythonQueryResponse(
        [property: JsonPropertyName("scope_result")] string ScopeResult,
        [property: JsonPropertyName("answer_status")] string AnswerStatus,
        [property: JsonPropertyName("period_start")] string? PeriodStart,
        [property: JsonPropertyName("period_end")] string? PeriodEnd,
        [property: JsonPropertyName("answer")] string Answer,
        [property: JsonPropertyName("citations")] IReadOnlyList<PythonCitationDto>? Citations
    );
}
