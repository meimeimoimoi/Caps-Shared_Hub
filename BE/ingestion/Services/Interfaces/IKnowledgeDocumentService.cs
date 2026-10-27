using ingestion.Dtos;

namespace ingestion.Services.Interfaces;

public interface IKnowledgeDocumentService
{
    Task<DocumentActionResponseDto> ApproveAsync(
        Guid documentId,
        Guid adminUserId,
        CancellationToken cancellationToken = default
    );
    Task<DocumentActionResponseDto> RetryIndexAsync(
        Guid documentId,
        Guid adminUserId,
        CancellationToken cancellationToken = default
    );
}
