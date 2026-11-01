using static Caps.RagQuery.Dtos.RagQueryDtos;

namespace Caps.RagQuery.Services.Interface;

public interface IChatAiClient
{
    Task<RagQueryResponse> QueryAsync(RagQueryRequest request, CancellationToken cancellationToken = default);
}

