using Caps.Common.Application;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>One document version for review.</summary>
public sealed record GetDocumentPreviewQuery(Guid DocumentId);

/// <summary>Returns the document with its legal source and parsed content, in any status.</summary>
public sealed class GetDocumentPreviewHandler(IngestionDbContext db)
    : IQueryHandler<GetDocumentPreviewQuery, DocumentPreviewResponse>
{
    public async Task<DocumentPreviewResponse> HandleAsync(
        GetDocumentPreviewQuery query,
        CancellationToken ct
    )
    {
        var document =
            await db
                .KnowledgeDocuments.AsNoTracking()
                .Include(x => x.LegalSource)
                .FirstOrDefaultAsync(x => x.Id == query.DocumentId, ct)
            ?? throw IngestionErrors.DocumentNotFound();
        return DocumentPreviewResponse.From(document);
    }
}
