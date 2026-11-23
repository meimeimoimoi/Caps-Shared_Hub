using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Request payload for querying the internal RAG service.</summary>
public sealed record RagQueryRequest(
    Guid ConversationId,
    string Query,
    string? Clarification,
    DateOnly? PeriodStart,
    DateOnly? PeriodEnd
);

/// <summary>Response returned by the internal RAG service.</summary>
public sealed record RagQueryResponse(
    string Content,
    string ScopeResult,
    string AnswerStatus,
    DateOnly? PeriodStart,
    DateOnly? PeriodEnd,
    List<CitationDto> Citations
);

/// <summary>Client interface for querying the internal RAG service.</summary>
public interface IRagQueryClient
{
    Task<RagQueryResponse> QueryAsync(RagQueryRequest request, CancellationToken ct = default);
}
