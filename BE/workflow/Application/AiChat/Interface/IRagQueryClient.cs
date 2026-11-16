using Caps.Workflow.Application.Abstractions;

namespace Caps.Workflow.Application.AiChat.Interfaces;

/// <summary>Client interface for calling the internal RAG query service.</summary>
public interface IRagQueryClient
{
    /// <summary>Calls internal rag-query service to retrieve AI answer and legal citations.</summary>
    Task<RagQueryResponse> QueryAsync(
        RagQueryRequest request,
        CancellationToken cancellationToken = default
    );
}
