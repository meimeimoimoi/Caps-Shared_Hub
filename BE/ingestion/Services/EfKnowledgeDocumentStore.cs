using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.Entities;
using Caps.Ingestion.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Services;

/// <summary>EF Core store backing <see cref="KnowledgeDocumentService"/> operations.</summary>
public sealed class EfKnowledgeDocumentStore(IngestionDbContext db) : IKnowledgeDocumentStore
{
    public Task<KnowledgeDocument?> GetDocumentWithSourceAsync(
        Guid documentId,
        CancellationToken cancellationToken = default
    ) =>
        db
            .KnowledgeDocuments.Include(d => d.LegalSource)
            .FirstOrDefaultAsync(d => d.Id == documentId, cancellationToken);

    public Task<bool> HasIndexedChunksAsync(
        Guid documentId,
        CancellationToken cancellationToken = default
    ) => db.KbChunks.AnyAsync(c => c.KnowledgeDocumentId == documentId, cancellationToken);

    public async Task<int> GetMaxIndexRetryAsync(
        int defaultValue,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            var config = await db.SystemConfigs.FirstOrDefaultAsync(
                c => c.Key == "KB_INDEX_MAX_RETRY",
                cancellationToken
            );
            if (config != null && int.TryParse(config.Value.Trim('"'), out var configured))
            {
                return configured;
            }
        }
        catch
        {
            // Fall back to default retry cap when system_config is absent or malformed.
        }

        return defaultValue;
    }

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        db.SaveChangesAsync(cancellationToken);

    public async Task ReplaceChunksAndMarkIndexedAsync(
        KnowledgeDocument document,
        IReadOnlyList<KbChunk> newChunks,
        DateTimeOffset indexedAt,
        CancellationToken cancellationToken = default
    )
    {
        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);

        var oldChunks = await db
            .KbChunks.Where(c => c.KnowledgeDocumentId == document.Id)
            .ToListAsync(cancellationToken);
        db.KbChunks.RemoveRange(oldChunks);

        if (newChunks.Count > 0)
        {
            db.KbChunks.AddRange(newChunks);
        }

        document.Status = DocumentStatuses.Indexed;
        document.IndexedAt = indexedAt;
        document.LastError = null;

        await db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);
    }

    public async Task MarkIndexFailedAsync(
        Guid documentId,
        string errorMessage,
        CancellationToken cancellationToken = default
    )
    {
        db.ChangeTracker.Clear();

        var failedDoc = await db.KnowledgeDocuments.FirstOrDefaultAsync(
            d => d.Id == documentId,
            cancellationToken
        );
        if (failedDoc is null)
        {
            return;
        }

        failedDoc.Status = DocumentStatuses.IndexFailed;
        failedDoc.LastError = errorMessage;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task ApplyMetadataUpdateAsync(
        KnowledgeDocument document,
        DateOnly? effectiveFrom,
        bool updateEffectiveFrom,
        DateOnly? effectiveTo,
        bool updateEffectiveTo,
        string? status,
        CancellationToken cancellationToken = default
    )
    {
        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);

        if (updateEffectiveFrom)
        {
            document.EffectiveFrom = effectiveFrom;
        }

        if (updateEffectiveTo)
        {
            document.EffectiveTo = effectiveTo;
        }

        if (status is not null)
        {
            document.Status = status;
        }

        if (updateEffectiveFrom || updateEffectiveTo)
        {
            var chunks = await db
                .KbChunks.Where(c => c.KnowledgeDocumentId == document.Id)
                .ToListAsync(cancellationToken);
            foreach (var chunk in chunks)
            {
                if (updateEffectiveFrom)
                {
                    chunk.EffectiveFrom = effectiveFrom;
                }

                if (updateEffectiveTo)
                {
                    chunk.EffectiveTo = effectiveTo;
                }
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);
    }

    public async Task DeleteDocumentAsync(
        KnowledgeDocument document,
        CancellationToken cancellationToken = default
    )
    {
        var chunks = await db
            .KbChunks.Where(c => c.KnowledgeDocumentId == document.Id)
            .ToListAsync(cancellationToken);
        if (chunks.Count > 0)
        {
            db.KbChunks.RemoveRange(chunks);
        }

        db.KnowledgeDocuments.Remove(document);
        await db.SaveChangesAsync(cancellationToken);
    }
}
