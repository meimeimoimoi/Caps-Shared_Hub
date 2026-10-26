using Caps.Ingestion.Dtos;

namespace Caps.Ingestion.Services.Interface;

public interface IKnowledgeDocumentService
{
    Task<DocumentActionResponseDto> ApproveAsync(Guid documentId, Guid adminUserId, CancellationToken cancellationToken = default);
    Task<DocumentActionResponseDto> RetryIndexAsync(Guid documentId, Guid adminUserId, CancellationToken cancellationToken = default);
}
