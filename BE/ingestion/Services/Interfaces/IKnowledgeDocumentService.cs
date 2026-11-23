using Caps.Ingestion.Dtos;
using Caps.Ingestion.DTOs.Requests;

namespace ingestion.Services.Interfaces;

/// <summary>Application service managing approval, indexing retry, metadata sync, and deletion of knowledge documents.</summary>
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

    Task<DocumentActionResponseDto> UpdateMetadataAsync(
        Guid documentId,
        UpdateDocumentMetadataRequest request,
        CancellationToken cancellationToken = default
    );

    Task<DeleteDocumentResponseDto> DeleteAsync(
        Guid documentId,
        CancellationToken cancellationToken = default
    );
}
