using Caps.Workflow.Application.Abstractions;
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
    Task<RagQueryResponse> QueryAsync(
        RagQueryRequest request,
        CancellationToken cancellationToken = default);
}
