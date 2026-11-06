using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.Abstractions;

public sealed record RagQueryRequest(
    Guid ConversationId,
    string Query,
    string? Clarification,
    DateOnly? PeriodStart,
    DateOnly? PeriodEnd
);

public sealed record RagQueryResponse(
    string Content,
    string ScopeResult,
    string AnswerStatus,
    DateOnly? PeriodStart,
    DateOnly? PeriodEnd,
    List<CitationDto> Citations
);

public interface IRagQueryClient
{
    Task<RagQueryResponse> QueryAsync(RagQueryRequest request, CancellationToken ct = default);
}
