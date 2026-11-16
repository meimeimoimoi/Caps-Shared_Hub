using System.Net;
using Caps.Common.Domain;
using Caps.Ingestion.Constants;
using Caps.Ingestion.DTOs.Requests;
using Caps.Ingestion.Entities;
using Caps.Ingestion.Services;
using Caps.Ingestion.Services.Interfaces;
using Caps.Ingestion.Storage;
using ingestion.Services.Interfaces;
using static Caps.Ingestion.Dtos.AiServiceDtos;

namespace Caps.Ingestion.UnitTests;

public sealed class KnowledgeDocumentServiceTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 15, 10, 0, 0, TimeSpan.Zero);
    private static readonly Guid AdminId = Guid.NewGuid();

    [Fact]
    public async Task Approve_indexes_pending_document_and_persists_chunks()
    {
        var store = new FakeStore();
        var doc = store.Seed(DocumentStatuses.Pending);
        var ai = new FakeAiClient
        {
            NextIngestResult = new AiIngestResponseDto
            {
                Status = "SUCCESS",
                TotalChunks = 1,
                KbChunks =
                [
                    new AiChunkItemDto
                    {
                        ChunkIndex = 0,
                        QdrantPointId = "pt-1",
                        Article = "Dieu 1",
                        EffectiveFrom = "2024-01-01",
                    },
                ],
            },
        };
        var service = new KnowledgeDocumentService(
            store,
            ai,
            new FakeStorage(),
            new FixedTimeProvider(Now)
        );

        var result = await service.ApproveAsync(doc.Id, AdminId);

        Assert.Equal(DocumentStatuses.Indexed, result.Status);
        Assert.Equal(1, result.TotalChunksIndexed);
        Assert.Equal(AdminId, doc.ApprovedBy);
        Assert.Equal(Now, doc.ApprovedAt);
        Assert.Equal(Now, doc.IndexedAt);
        Assert.Single(store.Chunks);
    }

    [Fact]
    public async Task Approve_marks_index_failed_when_ai_service_throws()
    {
        var store = new FakeStore();
        var doc = store.Seed(DocumentStatuses.Pending);
        var ai = new FakeAiClient
        {
            IngestError = new HttpRequestException(
                "Upstream down",
                null,
                HttpStatusCode.BadGateway
            ),
        };
        var service = new KnowledgeDocumentService(
            store,
            ai,
            new FakeStorage(),
            new FixedTimeProvider(Now)
        );

        var result = await service.ApproveAsync(doc.Id, AdminId);

        Assert.Equal(DocumentStatuses.IndexFailed, result.Status);
        Assert.Equal("Upstream down", doc.LastError);
        Assert.Equal(DocumentStatuses.IndexFailed, doc.Status);
    }

    [Fact]
    public async Task Retry_index_enforces_max_retry_limit()
    {
        var store = new FakeStore { MaxRetry = 2 };
        var doc = store.Seed(DocumentStatuses.IndexFailed, retryCount: 2);
        var service = new KnowledgeDocumentService(
            store,
            new FakeAiClient(),
            new FakeStorage(),
            new FixedTimeProvider(Now)
        );

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.RetryIndexAsync(doc.Id, AdminId)
        );

        Assert.Equal("INDEX_RETRY_EXCEEDED", ex.Code);
        Assert.Equal(ErrorType.Conflict, ex.Type);
    }

    [Fact]
    public async Task Update_metadata_syncs_qdrant_status_and_clears_effective_to()
    {
        var store = new FakeStore();
        var doc = store.Seed(
            DocumentStatuses.Indexed,
            effectiveFrom: new DateOnly(2024, 1, 1),
            effectiveTo: new DateOnly(2025, 12, 31)
        );
        store.Chunks.Add(
            new KbChunk
            {
                KnowledgeDocumentId = doc.Id,
                ChunkIndex = 0,
                QdrantPointId = "pt-1",
                EffectiveFrom = doc.EffectiveFrom,
                EffectiveTo = doc.EffectiveTo,
            }
        );
        var ai = new FakeAiClient { NextMatchedCount = 4 };
        var service = new KnowledgeDocumentService(
            store,
            ai,
            new FakeStorage(),
            new FixedTimeProvider(Now)
        );

        var result = await service.UpdateMetadataAsync(
            doc.Id,
            new UpdateDocumentMetadataRequest { ClearEffectiveTo = true, Status = "EXPIRED" }
        );

        Assert.Equal(DocumentStatuses.Expired, result.Status);
        Assert.Equal(4, result.TotalChunksIndexed);
        Assert.Null(doc.EffectiveTo);
        Assert.Null(Assert.Single(store.Chunks).EffectiveTo);
        Assert.NotNull(ai.LastMetadataRequest);
        Assert.True(ai.LastMetadataRequest!.ClearEffectiveTo);
        Assert.Equal("EXPIRED", ai.LastMetadataRequest.Status);
    }

    [Fact]
    public async Task Update_metadata_maps_indexed_back_to_qdrant_approved()
    {
        var store = new FakeStore();
        var doc = store.Seed(DocumentStatuses.Expired);
        var ai = new FakeAiClient { NextMatchedCount = 2 };
        var service = new KnowledgeDocumentService(
            store,
            ai,
            new FakeStorage(),
            new FixedTimeProvider(Now)
        );

        var result = await service.UpdateMetadataAsync(
            doc.Id,
            new UpdateDocumentMetadataRequest { Status = "indexed" }
        );

        Assert.Equal(DocumentStatuses.Indexed, result.Status);
        Assert.Equal(DocumentStatuses.Approved, ai.LastMetadataRequest?.Status);
    }

    [Fact]
    public async Task Update_metadata_rejects_status_change_on_pending_document()
    {
        var store = new FakeStore();
        var doc = store.Seed(DocumentStatuses.Pending);
        var service = new KnowledgeDocumentService(
            store,
            new FakeAiClient(),
            new FakeStorage(),
            new FixedTimeProvider(Now)
        );

        var ex = await Assert.ThrowsAsync<AppException>(() =>
            service.UpdateMetadataAsync(
                doc.Id,
                new UpdateDocumentMetadataRequest { Status = "EXPIRED" }
            )
        );

        Assert.Equal("DOCUMENT_NOT_INDEXED", ex.Code);
        Assert.Equal(ErrorType.Conflict, ex.Type);
    }

    [Fact]
    public async Task Delete_removes_vectors_storage_file_and_database_document()
    {
        var store = new FakeStore();
        var doc = store.Seed(DocumentStatuses.Indexed, source: DocumentSources.ManualUpload);
        store.Chunks.Add(
            new KbChunk
            {
                KnowledgeDocumentId = doc.Id,
                ChunkIndex = 0,
                QdrantPointId = "pt-1",
            }
        );
        var ai = new FakeAiClient { NextDeletedCount = 6 };
        var storage = new FakeStorage();
        var service = new KnowledgeDocumentService(store, ai, storage, new FixedTimeProvider(Now));

        var result = await service.DeleteAsync(doc.Id);

        Assert.Equal(doc.Id, result.DocumentId);
        Assert.Equal(6, result.DeletedVectorsCount);
        Assert.Contains(doc.FileUrl, storage.DeletedKeys);
        Assert.DoesNotContain(doc, store.Documents);
        Assert.Empty(store.Chunks);
    }

    [Fact]
    public async Task Delete_preserves_document_when_ai_service_is_unavailable()
    {
        var store = new FakeStore();
        var doc = store.Seed(DocumentStatuses.Indexed, source: DocumentSources.ManualUpload);
        var ai = new FakeAiClient
        {
            DeleteError = new HttpRequestException(
                "Qdrant down",
                null,
                HttpStatusCode.ServiceUnavailable
            ),
        };
        var storage = new FakeStorage();
        var service = new KnowledgeDocumentService(store, ai, storage, new FixedTimeProvider(Now));

        var ex = await Assert.ThrowsAsync<AppException>(() => service.DeleteAsync(doc.Id));

        Assert.Equal("AI_SERVICE_UNAVAILABLE", ex.Code);
        Assert.Equal(ErrorType.Unavailable, ex.Type);
        Assert.Contains(doc, store.Documents);
        Assert.Empty(storage.DeletedKeys);
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => utcNow;
    }

    private sealed class FakeStorage : IObjectStorage
    {
        public List<string> DeletedKeys { get; } = [];

        public Task PutAsync(
            string key,
            byte[] content,
            string contentType,
            CancellationToken ct
        ) => Task.CompletedTask;

        public Task<Stream> OpenAsync(string key, CancellationToken ct) =>
            Task.FromResult<Stream>(new MemoryStream());

        public Task DeleteQuietlyAsync(string key)
        {
            DeletedKeys.Add(key);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeAiClient : IAiServiceClient
    {
        public AiIngestResponseDto NextIngestResult { get; set; } = new();
        public Exception? IngestError { get; set; }
        public int NextDeletedCount { get; set; }
        public Exception? DeleteError { get; set; }
        public int NextMatchedCount { get; set; }
        public AiUpdateMetadataRequestDto? LastMetadataRequest { get; private set; }

        public Task<AiIngestResponseDto> ChunkAndEmbedAsync(
            AiIngestRequestDto req,
            CancellationToken cancellationToken = default
        )
        {
            if (IngestError is not null)
            {
                throw IngestError;
            }
            return Task.FromResult(NextIngestResult);
        }

        public Task<AiDeleteVectorsResponseDto> DeleteDocumentVectorsAsync(
            Guid knowledgeDocumentId,
            CancellationToken cancellationToken = default
        )
        {
            if (DeleteError is not null)
            {
                throw DeleteError;
            }
            return Task.FromResult(
                new AiDeleteVectorsResponseDto
                {
                    Status = "SUCCESS",
                    KnowledgeDocumentId = knowledgeDocumentId.ToString(),
                    DeletedCount = NextDeletedCount,
                }
            );
        }

        public Task<AiUpdateMetadataResponseDto> UpdateDocumentMetadataAsync(
            Guid knowledgeDocumentId,
            AiUpdateMetadataRequestDto req,
            CancellationToken cancellationToken = default
        )
        {
            LastMetadataRequest = req;
            return Task.FromResult(
                new AiUpdateMetadataResponseDto
                {
                    Status = "SUCCESS",
                    KnowledgeDocumentId = knowledgeDocumentId.ToString(),
                    MatchedCount = NextMatchedCount,
                }
            );
        }
    }

    private sealed class FakeStore : IKnowledgeDocumentStore
    {
        public List<KnowledgeDocument> Documents { get; } = [];
        public List<KbChunk> Chunks { get; } = [];
        public int MaxRetry { get; set; } = 3;

        public KnowledgeDocument Seed(
            string status,
            int retryCount = 0,
            string source = DocumentSources.CrawlVbpl,
            DateOnly? effectiveFrom = null,
            DateOnly? effectiveTo = null
        )
        {
            var srcId = Guid.NewGuid();
            var docId = Guid.NewGuid();
            var doc = new KnowledgeDocument
            {
                Id = docId,
                LegalSourceId = srcId,
                LegalSource = new LegalSource
                {
                    Id = srcId,
                    DocumentNumber = "78/2014/TT-BTC",
                    DocType = "Thong tu",
                    Title = "Tax law",
                },
                VersionNo = 1,
                Source = source,
                FileUrl = $"knowledge/{docId}",
                FileHash = docId.ToString("N"),
                ContentJson = "{\"chunks\":[{\"chunk_index\":0,\"text\":\"Dieu 1\"}]}",
                EffectiveFrom = effectiveFrom,
                EffectiveTo = effectiveTo,
                Status = status,
                RetryCount = retryCount,
                CreatedAt = Now,
            };
            Documents.Add(doc);
            return doc;
        }

        public Task<KnowledgeDocument?> GetDocumentWithSourceAsync(
            Guid documentId,
            CancellationToken cancellationToken = default
        ) => Task.FromResult(Documents.SingleOrDefault(d => d.Id == documentId));

        public Task<bool> HasIndexedChunksAsync(
            Guid documentId,
            CancellationToken cancellationToken = default
        ) => Task.FromResult(Chunks.Any(c => c.KnowledgeDocumentId == documentId));

        public Task<int> GetMaxIndexRetryAsync(
            int defaultValue,
            CancellationToken cancellationToken = default
        ) => Task.FromResult(MaxRetry);

        public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task ReplaceChunksAndMarkIndexedAsync(
            KnowledgeDocument document,
            IReadOnlyList<KbChunk> newChunks,
            DateTimeOffset indexedAt,
            CancellationToken cancellationToken = default
        )
        {
            Chunks.RemoveAll(c => c.KnowledgeDocumentId == document.Id);
            Chunks.AddRange(newChunks);
            document.Status = DocumentStatuses.Indexed;
            document.IndexedAt = indexedAt;
            document.LastError = null;
            return Task.CompletedTask;
        }

        public Task MarkIndexFailedAsync(
            Guid documentId,
            string errorMessage,
            CancellationToken cancellationToken = default
        )
        {
            var doc = Documents.SingleOrDefault(d => d.Id == documentId);
            if (doc is not null)
            {
                doc.Status = DocumentStatuses.IndexFailed;
                doc.LastError = errorMessage;
            }
            return Task.CompletedTask;
        }

        public Task ApplyMetadataUpdateAsync(
            KnowledgeDocument document,
            DateOnly? effectiveFrom,
            bool updateEffectiveFrom,
            DateOnly? effectiveTo,
            bool updateEffectiveTo,
            string? status,
            CancellationToken cancellationToken = default
        )
        {
            if (updateEffectiveFrom)
                document.EffectiveFrom = effectiveFrom;
            if (updateEffectiveTo)
                document.EffectiveTo = effectiveTo;
            if (status is not null)
                document.Status = status;

            foreach (var chunk in Chunks.Where(c => c.KnowledgeDocumentId == document.Id))
            {
                if (updateEffectiveFrom)
                    chunk.EffectiveFrom = effectiveFrom;
                if (updateEffectiveTo)
                    chunk.EffectiveTo = effectiveTo;
            }
            return Task.CompletedTask;
        }

        public Task DeleteDocumentAsync(
            KnowledgeDocument document,
            CancellationToken cancellationToken = default
        )
        {
            Chunks.RemoveAll(c => c.KnowledgeDocumentId == document.Id);
            Documents.Remove(document);
            return Task.CompletedTask;
        }
    }
}
