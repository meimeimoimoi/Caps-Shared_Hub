using System.Globalization;
using System.Net;
using System.Text.Json.Nodes;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Dtos;
using Caps.Ingestion.DTOs.Requests;
using Caps.Ingestion.Entities;
using Caps.Ingestion.Services.Interfaces;
using Caps.Ingestion.Storage;
using ingestion.Services.Interfaces;
using static Caps.Ingestion.Dtos.AiServiceDtos;

namespace Caps.Ingestion.Services;

/// <summary>Coordinates knowledge document approval, RAG indexing retries, Qdrant metadata updates, and deletions.</summary>
public sealed class KnowledgeDocumentService(
    IKnowledgeDocumentStore store,
    IAiServiceClient aiClient,
    IObjectStorage objectStorage,
    TimeProvider? timeProvider = null
) : IKnowledgeDocumentService
{
    private const int DefaultMaxIndexRetry = 3;
    private readonly TimeProvider _timeProvider = timeProvider ?? TimeProvider.System;

    public async Task<DocumentActionResponseDto> ApproveAsync(
        Guid documentId,
        Guid adminUserId,
        CancellationToken cancellationToken = default
    )
    {
        var doc =
            await store.GetDocumentWithSourceAsync(documentId, cancellationToken)
            ?? throw IngestionErrors.DocumentNotFound();

        if (doc.Status != DocumentStatuses.Pending)
        {
            throw IngestionErrors.DocumentNotPending();
        }

        if (doc.ContentJson?.Contains("PARSE_FAILED", StringComparison.Ordinal) == true)
        {
            throw IngestionErrors.DocumentParseFailed();
        }

        doc.ApprovedBy = adminUserId;
        doc.ApprovedAt = _timeProvider.GetUtcNow();
        doc.Status = DocumentStatuses.Approved;
        await store.SaveChangesAsync(cancellationToken);

        return await ProcessIndexingPipelineAsync(doc, cancellationToken);
    }

    public async Task<DocumentActionResponseDto> RetryIndexAsync(
        Guid documentId,
        Guid adminUserId,
        CancellationToken cancellationToken = default
    )
    {
        var doc =
            await store.GetDocumentWithSourceAsync(documentId, cancellationToken)
            ?? throw IngestionErrors.DocumentNotFound();

        if (doc.Status != DocumentStatuses.IndexFailed)
        {
            throw IngestionErrors.DocumentNotIndexFailed();
        }

        var maxRetry = await store.GetMaxIndexRetryAsync(DefaultMaxIndexRetry, cancellationToken);
        if (doc.RetryCount >= maxRetry)
        {
            throw IngestionErrors.IndexRetryExceeded(maxRetry);
        }

        doc.RetryCount++;
        await store.SaveChangesAsync(cancellationToken);

        return await ProcessIndexingPipelineAsync(doc, cancellationToken);
    }

    public async Task<DocumentActionResponseDto> UpdateMetadataAsync(
        Guid documentId,
        UpdateDocumentMetadataRequest request,
        CancellationToken cancellationToken = default
    )
    {
        var updateFrom = request.EffectiveFrom.HasValue;
        var updateTo = request.EffectiveTo.HasValue || request.ClearEffectiveTo;
        var normalizedStatus = NormalizeLifecycleStatus(request.Status);

        if (!updateFrom && !updateTo && normalizedStatus is null)
        {
            throw IngestionErrors.MetadataUpdateEmpty();
        }

        var doc =
            await store.GetDocumentWithSourceAsync(documentId, cancellationToken)
            ?? throw IngestionErrors.DocumentNotFound();

        if (normalizedStatus is not null && !DocumentStatuses.HasVectorLifecycle(doc.Status))
        {
            throw IngestionErrors.DocumentNotIndexed();
        }

        var nextFrom = request.EffectiveFrom ?? doc.EffectiveFrom;
        var nextTo = request.ClearEffectiveTo ? null : (request.EffectiveTo ?? doc.EffectiveTo);
        if (nextFrom.HasValue && nextTo.HasValue && nextFrom > nextTo)
        {
            throw IngestionErrors.InvalidEffectivePeriod();
        }

        int? matchedCount = null;
        var hasVectors =
            DocumentStatuses.HasVectorLifecycle(doc.Status)
            || await store.HasIndexedChunksAsync(doc.Id, cancellationToken);
        if (hasVectors)
        {
            var qdrantStatus = normalizedStatus switch
            {
                null => null,
                DocumentStatuses.Indexed => DocumentStatuses.Approved,
                _ => normalizedStatus,
            };
            var aiReq = new AiUpdateMetadataRequestDto(
                EffectiveFrom: request.EffectiveFrom?.ToString(
                    "yyyy-MM-dd",
                    CultureInfo.InvariantCulture
                ),
                EffectiveTo: request.ClearEffectiveTo
                    ? null
                    : request.EffectiveTo?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                ClearEffectiveTo: request.ClearEffectiveTo,
                Status: qdrantStatus
            );
            matchedCount = await SyncQdrantMetadataAsync(doc.Id, aiReq, cancellationToken);
        }

        await store.ApplyMetadataUpdateAsync(
            doc,
            nextFrom,
            updateFrom,
            nextTo,
            updateTo,
            normalizedStatus,
            cancellationToken
        );

        return new DocumentActionResponseDto
        {
            DocumentId = doc.Id,
            Status = doc.Status,
            Message = "Metadata tài liệu đã được cập nhật.",
            TotalChunksIndexed = matchedCount,
            RetryCount = doc.RetryCount,
            LastError = doc.LastError,
        };
    }

    public async Task<DeleteDocumentResponseDto> DeleteAsync(
        Guid documentId,
        CancellationToken cancellationToken = default
    )
    {
        var doc =
            await store.GetDocumentWithSourceAsync(documentId, cancellationToken)
            ?? throw IngestionErrors.DocumentNotFound();

        var deletedVectorsCount = 0;
        var mayHaveVectors =
            DocumentStatuses.HasVectorLifecycle(doc.Status)
            || doc.Status == DocumentStatuses.IndexFailed
            || await store.HasIndexedChunksAsync(doc.Id, cancellationToken);
        if (mayHaveVectors)
        {
            var response = await CallAiServiceAsync(
                () => aiClient.DeleteDocumentVectorsAsync(doc.Id, cancellationToken),
                cancellationToken
            );
            deletedVectorsCount = response.DeletedCount;
        }

        if (doc.Source == DocumentSources.ManualUpload && !string.IsNullOrWhiteSpace(doc.FileUrl))
        {
            await objectStorage.DeleteQuietlyAsync(doc.FileUrl);
        }

        await store.DeleteDocumentAsync(doc, cancellationToken);

        return new DeleteDocumentResponseDto(
            DocumentId: doc.Id,
            DeletedVectorsCount: deletedVectorsCount,
            Message: "Tài liệu và vector liên quan đã được xóa."
        );
    }

    private async Task<DocumentActionResponseDto> ProcessIndexingPipelineAsync(
        KnowledgeDocument doc,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var aiRequest = BuildIngestRequest(doc);
            var aiResponse = await aiClient.ChunkAndEmbedAsync(aiRequest, cancellationToken);

            var kbChunks = aiResponse.KbChunks.ConvertAll(item => new KbChunk
            {
                KnowledgeDocumentId = doc.Id,
                ChunkIndex = item.ChunkIndex,
                QdrantPointId = item.QdrantPointId,
                Article = item.Article,
                Clause = item.Clause,
                Point = item.Point,
                EffectiveFrom = DateOnly.TryParse(
                    item.EffectiveFrom,
                    CultureInfo.InvariantCulture,
                    out var ef
                )
                    ? ef
                    : doc.EffectiveFrom,
                EffectiveTo = DateOnly.TryParse(
                    item.EffectiveTo,
                    CultureInfo.InvariantCulture,
                    out var et
                )
                    ? et
                    : doc.EffectiveTo,
                Metadata = item.Metadata?.ToJsonString() ?? "{}",
            });

            await store.ReplaceChunksAndMarkIndexedAsync(
                doc,
                kbChunks,
                _timeProvider.GetUtcNow(),
                cancellationToken
            );

            return new DocumentActionResponseDto
            {
                DocumentId = doc.Id,
                Status = DocumentStatuses.Indexed,
                Message = "Tài liệu đã được phê duyệt và lập chỉ mục vào Qdrant thành công.",
                TotalChunksIndexed = aiResponse.TotalChunks,
                RetryCount = doc.RetryCount,
                LastError = null,
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            await store.MarkIndexFailedAsync(doc.Id, ex.Message, cancellationToken);

            return new DocumentActionResponseDto
            {
                DocumentId = doc.Id,
                Status = DocumentStatuses.IndexFailed,
                Message = "Quá trình lập chỉ mục vào Qdrant thất bại.",
                TotalChunksIndexed = 0,
                RetryCount = doc.RetryCount,
                LastError = ex.Message,
            };
        }
    }

    private static AiIngestRequestDto BuildIngestRequest(KnowledgeDocument doc)
    {
        var contentJsonNode = string.IsNullOrEmpty(doc.ContentJson)
            ? null
            : JsonNode.Parse(doc.ContentJson);
        List<JsonNode>? chunksList = null;

        if (contentJsonNode?["chunks"] is JsonArray chunksArray)
        {
            chunksList = chunksArray.Select(c => c!.DeepClone()).ToList();
        }

        return new AiIngestRequestDto
        {
            KnowledgeDocumentId = doc.Id.ToString(),
            LegalSourceId = doc.LegalSourceId.ToString(),
            DocumentNumber = doc.LegalSource.DocumentNumber,
            Title = doc.LegalSource.Title,
            DocType = doc.LegalSource.DocType,
            EffectiveFrom = doc.EffectiveFrom?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            EffectiveTo = doc.EffectiveTo?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            VbhnEffectiveFrom = contentJsonNode?["metadata"]?["vbhn_effective_from"]?.ToString(),
            ContentJson = contentJsonNode,
            Chunks = chunksList,
        };
    }

    private static string? NormalizeLifecycleStatus(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
        {
            return null;
        }

        var normalized = status.Trim().ToUpperInvariant();
        if (DocumentStatuses.HasVectorLifecycle(normalized))
        {
            return normalized;
        }

        throw IngestionErrors.InvalidLifecycleStatus(status);
    }

    private async Task<int> SyncQdrantMetadataAsync(
        Guid documentId,
        AiUpdateMetadataRequestDto aiReq,
        CancellationToken cancellationToken
    )
    {
        try
        {
            var result = await aiClient.UpdateDocumentMetadataAsync(
                documentId,
                aiReq,
                cancellationToken
            );
            return result.MatchedCount;
        }
        catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
        {
            // No vectors currently stored in Qdrant for this document; allow Postgres metadata sync to proceed.
            return 0;
        }
        catch (HttpRequestException)
        {
            throw IngestionErrors.AiServiceUnavailable("AI vector service is unavailable.");
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw IngestionErrors.AiServiceUnavailable("AI vector service timed out.");
        }
    }

    private static async Task<T> CallAiServiceAsync<T>(
        Func<Task<T>> action,
        CancellationToken cancellationToken
    )
    {
        try
        {
            return await action();
        }
        catch (HttpRequestException)
        {
            throw IngestionErrors.AiServiceUnavailable("AI vector service is unavailable.");
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw IngestionErrors.AiServiceUnavailable("AI vector service timed out.");
        }
    }
}
