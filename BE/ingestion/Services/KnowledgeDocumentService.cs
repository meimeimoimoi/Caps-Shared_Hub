using System.Globalization;
using System.Text.Json.Nodes;
using Caps.Ingestion.Data;
using Caps.Ingestion.Entities;
using ingestion.Dtos;
using ingestion.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using static Caps.Ingestion.Dtos.AiServiceDtos;

namespace ingestion.Services;

public class KnowledgeDocumentService : IKnowledgeDocumentService
{
    private const int DefaultMaxRetry = 3;

    private readonly IngestionDbContext _db;
    private readonly IAiServiceClient _aiClient;
    private readonly TimeProvider _timeProvider;

    public KnowledgeDocumentService(
        IngestionDbContext db,
        IAiServiceClient aiClient,
        TimeProvider? timeProvider = null
    )
    {
        _db = db;
        _aiClient = aiClient;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    public async Task<DocumentActionResponseDto> ApproveAsync(
        Guid documentId,
        Guid adminUserId,
        CancellationToken cancellationToken = default
    )
    {
        var doc = await _db
            .KnowledgeDocuments.Include(d => d.LegalSource)
            .FirstOrDefaultAsync(d => d.Id == documentId, cancellationToken);

        if (doc == null)
        {
            throw new KeyNotFoundException($"không tìm thấy văn bản với ID: {documentId}");
        }

        // Block: Only PENDING documents can be approved
        if (doc.Status != "PENDING")
        {
            throw new InvalidOperationException(
                $"Không thể phê duyệt văn bản đang ở trạng thái '{doc.Status}'. Chỉ áp dụng cho trạng thái 'PENDING'."
            );
        }

        // Verify that document content parsing did not fail
        if (doc.ContentJson?.Contains("PARSE_FAILED", StringComparison.Ordinal) == true)
        {
            throw new InvalidOperationException(
                "Văn bản này đang bị lỗi bóc tách (PARSE_FAILED), không đủ điều kiện đưa vào RAG."
            );
        }

        doc.ApprovedAt = _timeProvider.GetUtcNow();
        doc.ApprovedBy = adminUserId;
        doc.Status = "APPROVED";
        await _db.SaveChangesAsync(cancellationToken);

        return await ProcessIndexingPipelineAsync(doc, cancellationToken);
    }

    public async Task<DocumentActionResponseDto> RetryIndexAsync(
        Guid documentId,
        Guid adminUserId,
        CancellationToken cancellationToken = default
    )
    {
        var doc = await _db
            .KnowledgeDocuments.Include(d => d.LegalSource)
            .FirstOrDefaultAsync(d => d.Id == documentId, cancellationToken);

        if (doc == null)
        {
            throw new KeyNotFoundException($"Không tìm thấy văn bản với ID: {documentId}");
        }

        // Block: Only documents in INDEX_FAILED status can be retried
        if (doc.Status != "INDEX_FAILED")
        {
            throw new InvalidOperationException(
                $"Chỉ có văn bản ở trạng thái 'INDEX_FAILED' mới được phép thử lại. Trạng thái hiện tại: '{doc.Status}'."
            );
        }

        if (doc.RetryCount >= DefaultMaxRetry)
        {
            throw new InvalidOperationException(
                $"Đã vượt quá số lần thử lại tối đa ({DefaultMaxRetry} lần). Vui lòng thông báo System Admin xử lý."
            );
        }

        // Increment retry count and rerun pipeline
        doc.RetryCount++;
        await _db.SaveChangesAsync(cancellationToken);

        return await ProcessIndexingPipelineAsync(doc, cancellationToken);
    }

    // Common pipeline to chunk, embed via AI Service, and persist chunks to database
    private async Task<DocumentActionResponseDto> ProcessIndexingPipelineAsync(
        KnowledgeDocument doc,
        CancellationToken cancellationToken
    )
    {
        try
        {
            // Extract JSON from database
            JsonNode? contentJsonNode = string.IsNullOrEmpty(doc.ContentJson)
                ? null
                : JsonNode.Parse(doc.ContentJson);
            List<JsonNode>? chunksList = null;

            // If crawler provided pre-extracted chunks, forward them
            if (contentJsonNode?["chunks"] is JsonArray chunksArray)
            {
                chunksList = chunksArray.Select(c => c!.DeepClone()).ToList();
            }

            // Prepare DTO for AI service
            var aiRequest = new AiIngestRequestDto
            {
                KnowledgeDocumentId = doc.Id.ToString(),
                LegalSourceId = doc.LegalSourceId.ToString(),
                DocumentNumber = doc.LegalSource.DocumentNumber,
                Title = doc.LegalSource.Title,
                DocType = doc.LegalSource.DocType,
                EffectiveFrom = doc.EffectiveFrom?.ToString(
                    "yyyy-MM-dd",
                    CultureInfo.InvariantCulture
                ),
                EffectiveTo = doc.EffectiveTo?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                VbhnEffectiveFrom = contentJsonNode?["metadata"]?[
                    "vbhn_effective_from"
                ]?.ToString(),
                ContentJson = contentJsonNode,
                Chunks = chunksList,
            };

            // 1. Call AI service to chunk and embed (push vectors to Qdrant)
            var aiResponse = await _aiClient.ChunkAndEmbedAsync(aiRequest, cancellationToken);

            // 2. Open transaction to persist kb_chunk records and update status
            await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);

            // Remove existing chunks for this document if retrying
            var oldChunks = await _db
                .KbChunks.Where(c => c.KnowledgeDocumentId == doc.Id)
                .ToListAsync(cancellationToken);
            _db.KbChunks.RemoveRange(oldChunks);

            // Add new chunks returned by AI service
            foreach (var item in aiResponse.KbChunks)
            {
                var kbChunk = new KbChunk
                {
                    Id = Guid.NewGuid(),
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
                };
                _db.KbChunks.Add(kbChunk);
            }

            // Update document status on success
            doc.Status = "INDEXED";
            doc.IndexedAt = _timeProvider.GetUtcNow();
            doc.LastError = null;

            await _db.SaveChangesAsync(cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return new DocumentActionResponseDto
            {
                DocumentId = doc.Id,
                Status = "INDEXED",
                Message = "Tài liệu đã được phê duyệt và lập chỉ mục vào Qdrant thành công.",
                TotalChunksIndexed = aiResponse.TotalChunks,
                RetryCount = doc.RetryCount,
                LastError = null,
            };
        }
        catch (Exception ex)
        {
            // Reset pending tracked changes on failure before updating document error state
            _db.ChangeTracker.Clear();

            var failedDoc = await _db.KnowledgeDocuments.FirstOrDefaultAsync(
                d => d.Id == doc.Id,
                cancellationToken
            );
            if (failedDoc != null)
            {
                failedDoc.Status = "INDEX_FAILED";
                failedDoc.LastError = ex.Message;
                await _db.SaveChangesAsync(cancellationToken);
            }

            return new DocumentActionResponseDto
            {
                DocumentId = doc.Id,
                Status = "INDEX_FAILED",
                Message = "Quá trình lập chỉ mục vào Qdrant thất bại.",
                TotalChunksIndexed = 0,
                RetryCount = doc.RetryCount,
                LastError = ex.Message,
            };
        }
    }
}
