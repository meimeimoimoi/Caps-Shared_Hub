using static Caps.Ingestion.Dtos.AiServiceDtos;

namespace ingestion.Services.Interfaces;

/// <summary>HTTP client port for the Python AI indexing and vector lifecycle service.</summary>
public interface IAiServiceClient
{
    Task<AiIngestResponseDto> ChunkAndEmbedAsync(
        AiIngestRequestDto req,
        CancellationToken cancellationToken = default
    );

    Task<AiDeleteVectorsResponseDto> DeleteDocumentVectorsAsync(
        Guid knowledgeDocumentId,
        CancellationToken cancellationToken = default
    );

    Task<AiUpdateMetadataResponseDto> UpdateDocumentMetadataAsync(
        Guid knowledgeDocumentId,
        AiUpdateMetadataRequestDto req,
        CancellationToken cancellationToken = default
    );
}
