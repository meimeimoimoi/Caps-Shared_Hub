using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Caps.Workflow.Application.AiChat.DTOs.RagQueryClientDtos;

namespace Caps.Workflow.Application.AiChat.Interface;
public interface IRagQueryClient
{
    /// <summary>
    /// Calls internal rag-query service to retrieve AI answer and legal citations.
    /// </summary>
    Task<InternalRagQueryResponse> QueryAsync(
        InternalRagQueryRequest request,
        CancellationToken cancellationToken = default);
}
