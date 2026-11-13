using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Caps.RagQuery.Dtos;

public class RagQueryDtos
{
    /// <summary>
    /// Request received from the Workflow service.
    /// </summary>
    public sealed record RagQueryRequest(
        [Required(ErrorMessage = "Question is required.")]
    string Question,
        string? UserTaxPeriod = null
    );

    /// <summary>
    /// Citation details exposed to the Workflow service.
    /// </summary>
    public sealed record CitationDto(
        string? Article,
        string? Clause,
        string? Point,
        string DocNumber,
        string DocTitle,
        string? Text,
        string? EffectiveFrom,
        string? EffectiveTo
    );

    /// <summary>
    /// Unified response returned to the Workflow service.
    /// </summary>
    public sealed record RagQueryResponse(
        string ScopeResult,
        string AnswerStatus,
        string? PeriodStart,
        string? PeriodEnd,
        string Answer,
        IReadOnlyList<CitationDto> Citations
    );
}
