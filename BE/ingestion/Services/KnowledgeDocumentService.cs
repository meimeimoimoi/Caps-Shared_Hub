using System.Globalization;
using System.Text.Json.Nodes;
using Caps.Ingestion.Data;
using Caps.Ingestion.Dtos;
using Caps.Ingestion.Entities;
using Caps.Ingestion.Services.Interface;
using Microsoft.EntityFrameworkCore;
using static Caps.Ingestion.Dtos.AiServiceDtos;

namespace Caps.Ingestion.Services;

public class KnowledgeDocumentService : IKnowledgeDocumentService
{
    private readonly IngestionDbContext _db;
    private readonly IAiServiceClient _aiClient;

    public KnowledgeDocumentService(
        IngestionDbContext db,
        IAiServiceClient aiClient
    )
    {
        _db = db;
        _aiClient = aiClient;
    }

    // 1. POST /api/v1/knowledge/documents/{id}/approve
    public async Task<DocumentActionResponseDto> ApproveAsync(Guid documentId, Guid adminUserId, CancellationToken cancellationToken = default)
    {
        var doc = await _db.KnowledgeDocuments
            .Include(d => d.LegalSource)
            .FirstOrDefaultAsync(d => d.Id == documentId, cancellationToken);

        if (doc == null)
            throw new KeyNotFoundException($"Không tìm thấy văn bản với ID: {documentId}");

        // Only PENDING documents can be approved
        if (doc.Status != "PENDING")
            throw new InvalidOperationException($"Không thể phê duyệt văn bản đang ở trạng thái '{doc.Status}'. Chỉ áp dụng cho trạng thái 'PENDING'.");

        // Reject documents that failed parsing
        if (doc.ContentJson?.Contains("PARSE_FAILED") == true)
            throw new InvalidOperationException("Văn bản này đang bị lỗi bóc tách (PARSE_FAILED), không đủ điều kiện đưa vào RAG.");

        // Record approval metadata
        doc.ApprovedBy = adminUserId;
        doc.ApprovedAt = DateTimeOffset.UtcNow;
        doc.Status = "APPROVED";
        await _db.SaveChangesAsync(cancellationToken);

        // Trigger RAG indexing pipeline
        return await ProcessIndexingPipelineAsync(doc, cancellationToken);
    }

    // 2. POST /api/v1/knowledge/documents/{id}/retry-index
    public async Task<DocumentActionResponseDto> RetryIndexAsync(Guid documentId, Guid adminUserId, CancellationToken cancellationToken = default)
    {
        var doc = await _db.KnowledgeDocuments
            .Include(d => d.LegalSource)
            .FirstOrDefaultAsync(d => d.Id == documentId, cancellationToken);

        if (doc == null)
            throw new KeyNotFoundException($"Không tìm thấy văn bản với ID: {documentId}");

        // Only INDEX_FAILED documents can be retried
        if (doc.Status != "INDEX_FAILED")
            throw new InvalidOperationException($"Chỉ có văn bản ở trạng thái 'INDEX_FAILED' mới được phép thử lại. Trạng thái hiện tại: '{doc.Status}'.");

        // Read max retry limit from system_config (default to 3 if not configured)
        int maxRetry = 3;
        try
        {
            var config = await _db.SystemConfigs.FirstOrDefaultAsync(c => c.Key == "KB_INDEX_MAX_RETRY", cancellationToken);
            if (config != null && int.TryParse(config.Value.Trim('"'), out int cfgValue))
            {
                maxRetry = cfgValue;
            }
        }
        catch
        {
            // Fallback to default maxRetry = 3 if system_config table is unavailable
        }

        if (doc.RetryCount >= maxRetry)
        {
            throw new InvalidOperationException($"Đã vượt quá số lần thử lại tối đa ({maxRetry} lần). Vui lòng thông báo System Admin xử lý.");
        }

        // Increment retry counter and re-run pipeline
        doc.RetryCount++;
        await _db.SaveChangesAsync(cancellationToken);

        return await ProcessIndexingPipelineAsync(doc, cancellationToken);
    }

    // Shared pipeline to send document chunks to the AI service and persist chunk metadata in Postgres
    private async Task<DocumentActionResponseDto> ProcessIndexingPipelineAsync(KnowledgeDocument doc, CancellationToken cancellationToken)
    {
        try
        {
            JsonNode? contentJsonNode = string.IsNullOrEmpty(doc.ContentJson) ? null : JsonNode.Parse(doc.ContentJson);
            List<JsonNode>? chunksList = null;

            if (contentJsonNode?["chunks"] is JsonArray chunksArray)
            {
                chunksList = chunksArray.Select(c => c!.DeepClone()).ToList();
            }

            var aiRequest = new AiIngestRequestDto
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
                Chunks = chunksList
            };

            // 1. Call Python ai-service to chunk and index vectors into Qdrant
            var aiResponse = await _aiClient.ChunkAndEmbedAsync(aiRequest, cancellationToken);

            // 2. Open Postgres transaction to store kb_chunk rows and update document status
            await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);

            var oldChunks = _db.KbChunks.Where(c => c.KnowledgeDocumentId == doc.Id);
            _db.KbChunks.RemoveRange(oldChunks);

            foreach (var item in aiResponse.KbChunks)
            {
                var kbChunk = new KbChunk
                {
                    Id = Guid.CreateVersion7(),
                    KnowledgeDocumentId = doc.Id,
                    ChunkIndex = item.ChunkIndex,
                    QdrantPointId = item.QdrantPointId,
                    Article = item.Article,
                    Clause = item.Clause,
                    Point = item.Point,
                    EffectiveFrom = DateOnly.TryParse(item.EffectiveFrom, CultureInfo.InvariantCulture, out var ef) ? ef : doc.EffectiveFrom,
                    EffectiveTo = DateOnly.TryParse(item.EffectiveTo, CultureInfo.InvariantCulture, out var et) ? et : doc.EffectiveTo,
                    Metadata = item.Metadata?.ToJsonString() ?? "{}"
                };
                _db.KbChunks.Add(kbChunk);
            }

            doc.Status = "INDEXED";
            doc.IndexedAt = DateTimeOffset.UtcNow;
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
                LastError = null
            };
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            // Detach any unsaved KbChunk entities before recording the failure state
            foreach (var entry in _db.ChangeTracker.Entries<KbChunk>().ToList())
            {
                entry.State = EntityState.Detached;
            }

            doc.Status = "INDEX_FAILED";
            doc.LastError = ex.Message;
            await _db.SaveChangesAsync(cancellationToken);

            return new DocumentActionResponseDto
            {
                DocumentId = doc.Id,
                Status = "INDEX_FAILED",
                Message = "Quá trình lập chỉ mục vào Qdrant thất bại.",
                TotalChunksIndexed = 0,
                RetryCount = doc.RetryCount,
                LastError = ex.Message
            };
        }
    }
}
