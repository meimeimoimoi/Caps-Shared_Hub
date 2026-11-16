using Caps.Ingestion.Entities;

namespace Caps.Ingestion.Services.Interfaces;

/// <summary>Persistence port for knowledge document approval, indexing, metadata sync, and deletion.</summary>
public interface IKnowledgeDocumentStore
{
    Task<KnowledgeDocument?> GetDocumentWithSourceAsync(
        Guid documentId,
        CancellationToken cancellationToken = default
    );

    Task<bool> HasIndexedChunksAsync(
        Guid documentId,
        CancellationToken cancellationToken = default
    );

    Task<int> GetMaxIndexRetryAsync(
        int defaultValue,
        CancellationToken cancellationToken = default
    );

    Task SaveChangesAsync(CancellationToken cancellationToken = default);

    Task ReplaceChunksAndMarkIndexedAsync(
        KnowledgeDocument document,
        IReadOnlyList<KbChunk> newChunks,
        DateTimeOffset indexedAt,
        CancellationToken cancellationToken = default
    );

    Task MarkIndexFailedAsync(
        Guid documentId,
        string errorMessage,
        CancellationToken cancellationToken = default
    );

    Task ApplyMetadataUpdateAsync(
        KnowledgeDocument document,
        DateOnly? effectiveFrom,
        bool updateEffectiveFrom,
        DateOnly? effectiveTo,
        bool updateEffectiveTo,
        string? status,
        CancellationToken cancellationToken = default
    );

    Task DeleteDocumentAsync(
        KnowledgeDocument document,
        CancellationToken cancellationToken = default
    );
}
