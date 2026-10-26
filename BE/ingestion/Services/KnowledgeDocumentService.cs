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

        // Chặn: Chỉ văn bản đang PENDING mới được phê duyệt
        if (doc.Status != "PENDING")
            throw new InvalidOperationException($"Không thể phê duyệt văn bản đang ở trạng thái '{doc.Status}'. Chỉ áp dụng cho trạng thái 'PENDING'.");

        // Kiểm tra xem văn bản có bị parse lỗi không (Dạng file 64/2025)
        if (doc.ContentJson != null && doc.ContentJson.Contains("PARSE_FAILED"))
            throw new InvalidOperationException("Văn bản này đang bị lỗi bóc tách (PARSE_FAILED), không đủ điều kiện đưa vào RAG.");

        // Đóng dấu phê duyệt
        doc.ApprovedBy = adminUserId;
        doc.ApprovedAt = DateTimeOffset.UtcNow;
        doc.Status = "APPROVED";
        await _db.SaveChangesAsync(cancellationToken);

        // Kích hoạt RAG Pipeline
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

        // Chặn: Chỉ thử lại khi đang INDEX_FAILED
        if (doc.Status != "INDEX_FAILED")
            throw new InvalidOperationException($"Chỉ có văn bản ở trạng thái 'INDEX_FAILED' mới được phép thử lại. Trạng thái hiện tại: '{doc.Status}'.");

        // Lấy cấu hình giới hạn số lần retry từ bảng system_config (mặc định 3 lần nếu chưa config)
        int maxRetry = 3;
        var config = await _db.SystemConfigs.FirstOrDefaultAsync(c => c.Key == "KB_INDEX_MAX_RETRY", cancellationToken);
        if (config != null && int.TryParse(config.Value, out int cfgValue))
        {
            maxRetry = cfgValue;
        }

        if (doc.RetryCount >= maxRetry)
        {
            throw new InvalidOperationException($"Đã vượt quá số lần thử lại tối đa ({maxRetry} lần). Vui lòng thông báo System Admin xử lý.");
        }

        // Tăng biến đếm và chạy lại pipeline
        doc.RetryCount++;
        await _db.SaveChangesAsync(cancellationToken);

        return await ProcessIndexingPipelineAsync(doc, cancellationToken);
    }

    // Hàm dùng chung để đẩy dữ liệu sang AI Service và lưu Postgres
    private async Task<DocumentActionResponseDto> ProcessIndexingPipelineAsync(KnowledgeDocument doc, CancellationToken cancellationToken)
    {
        try
        {
            // Trích xuất JSON từ Postgres
            JsonNode? contentJsonNode = string.IsNullOrEmpty(doc.ContentJson) ? null : JsonNode.Parse(doc.ContentJson);
            List<JsonNode>? chunksList = null;

            // Nếu trong JSON của crawler có sẵn mảng chunks thì truyền đi luôn
            if (contentJsonNode?["chunks"] is JsonArray chunksArray)
            {
                chunksList = chunksArray.Select(c => c!.DeepClone()).ToList();
            }

            // Chuẩn bị DTO gọi sang Python
            var aiRequest = new AiIngestRequestDto
            {
                KnowledgeDocumentId = doc.Id.ToString(),
                LegalSourceId = doc.LegalSourceId.ToString(),
                DocumentNumber = doc.LegalSource.DocumentNumber,
                Title = doc.LegalSource.Title,
                DocType = doc.LegalSource.DocType,
                EffectiveFrom = doc.EffectiveFrom?.ToString("yyyy-MM-dd"),
                EffectiveTo = doc.EffectiveTo?.ToString("yyyy-MM-dd"),
                VbhnEffectiveFrom = contentJsonNode?["metadata"]?["vbhn_effective_from"]?.ToString(),
                ContentJson = contentJsonNode,
                Chunks = chunksList
            };

            // 1. Gọi sang Python ai-service (Đẩy Vector lên Qdrant)
            var aiResponse = await _aiClient.ChunkAndEmbedAsync(aiRequest, cancellationToken);

            // 2. Mở Transaction Postgres để lưu các dòng vào bảng kb_chunk và đổi status
            using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);

            // Xóa chunk cũ nếu đây là lần retry
            var oldChunks = _db.KbChunks.Where(c => c.KnowledgeDocumentId == doc.Id);
            _db.KbChunks.RemoveRange(oldChunks);

            // Thêm các chunk mới trả về từ AI Service
            foreach (var item in aiResponse.KbChunks)
            {
                var kbChunk = new KbChunk
                {
                    Id = Guid.CreateVersion7(), // Chuẩn Guid v7 như trong DBML
                    KnowledgeDocumentId = doc.Id,
                    ChunkIndex = item.ChunkIndex,
                    QdrantPointId = item.QdrantPointId,
                    Article = item.Article,
                    Clause = item.Clause,
                    Point = item.Point,
                    EffectiveFrom = DateOnly.TryParse(item.EffectiveFrom, out var ef) ? ef : doc.EffectiveFrom,
                    EffectiveTo = DateOnly.TryParse(item.EffectiveTo, out var et) ? et : doc.EffectiveTo,
                    Metadata = item.Metadata?.ToJsonString() ?? "{}"
                };
                _db.KbChunks.Add(kbChunk);
            }

            // Cập nhật trạng thái thành công
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
        catch (Exception ex)
        {

            // Khi phát sinh lỗi: Chuyển trạng thái sang INDEX_FAILED và ghi log lỗi
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

    Task<DocumentActionResponseDto> IKnowledgeDocumentService.RetryIndexAsync(Guid documentId, Guid adminUserId, CancellationToken cancellationToken)
    {
        throw new NotImplementedException();
    }
}
