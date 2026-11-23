using System.Text.Json.Nodes;
using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Storage;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>The original file of a document version.</summary>
public sealed record OpenDocumentFileQuery(Guid DocumentId);

/// <summary>Opens an uploaded original; crawled documents have no stored file.</summary>
public sealed class OpenDocumentFileHandler(IngestionDbContext db, IObjectStorage storage)
    : IQueryHandler<OpenDocumentFileQuery, DocumentFile>
{
    public async Task<DocumentFile> HandleAsync(OpenDocumentFileQuery query, CancellationToken ct)
    {
        var document =
            await db
                .KnowledgeDocuments.Where(x => x.Id == query.DocumentId)
                .Select(x => new
                {
                    x.Source,
                    x.FileUrl,
                    x.Metadata,
                })
                .FirstOrDefaultAsync(ct)
            ?? throw IngestionErrors.DocumentNotFound();
        if (document.Source != DocumentSources.ManualUpload)
            throw IngestionErrors.DocumentFileNotStored();
        // Name and type were recorded at upload (UploadDocumentHandler)
        var file = JsonNode.Parse(document.Metadata);
        var contentType = (string?)file?["contentType"] ?? "application/octet-stream";
        var fileName = (string?)file?["fileName"] ?? "document";
        var content = await storage.OpenAsync(document.FileUrl, ct);
        return new(content, contentType, fileName);
    }
}
