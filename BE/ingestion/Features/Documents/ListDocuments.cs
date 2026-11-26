using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>One page of document versions; Statuses empty = every status.</summary>
public sealed record ListDocumentsQuery(IReadOnlyList<string> Statuses, int Page, int PageSize);

/// <summary>Lists document versions of any status, newest first, so failed ones stay reachable after review.</summary>
public sealed class ListDocumentsHandler(IngestionDbContext db)
    : IQueryHandler<ListDocumentsQuery, PageResponse<DocumentSummaryResponse>>
{
    public async Task<PageResponse<DocumentSummaryResponse>> HandleAsync(
        ListDocumentsQuery query,
        CancellationToken ct
    )
    {
        Paging.Ensure(query.Page, query.PageSize);
        var unknown = query.Statuses.FirstOrDefault(s => !DocumentStatuses.All.Contains(s));
        if (unknown is not null)
            throw IngestionErrors.InvalidDocumentStatus(unknown);

        var documents = db.KnowledgeDocuments.AsQueryable();
        if (query.Statuses.Count > 0)
            documents = documents.Where(x => query.Statuses.Contains(x.Status));
        var total = await documents.CountAsync(ct);
        var items = await documents
            .OrderByDescending(x => x.CreatedAt)
            .ThenByDescending(x => x.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(DocumentSummaryResponse.Projection)
            .ToListAsync(ct);
        return new(items, query.Page, query.PageSize, total);
    }
}
