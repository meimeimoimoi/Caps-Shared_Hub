using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>One page of the review queue.</summary>
public sealed record ListPendingDocumentsQuery(int Page, int PageSize);

/// <summary>Lists PENDING documents oldest first, so the queue is reviewed in arrival order.</summary>
public sealed class ListPendingDocumentsHandler(IngestionDbContext db)
    : IQueryHandler<ListPendingDocumentsQuery, PageResponse<DocumentSummaryResponse>>
{
    public async Task<PageResponse<DocumentSummaryResponse>> HandleAsync(
        ListPendingDocumentsQuery query,
        CancellationToken ct
    )
    {
        Paging.Ensure(query.Page, query.PageSize);
        var pending = db.KnowledgeDocuments.Where(x => x.Status == DocumentStatuses.Pending);
        var total = await pending.CountAsync(ct);
        // Projected so the (large) content JSON is not loaded
        var items = await pending
            .OrderBy(x => x.CreatedAt)
            .ThenBy(x => x.Id)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(x => new DocumentSummaryResponse(
                x.Id,
                x.LegalSourceId,
                x.LegalSource.DocumentNumber,
                x.LegalSource.DocType,
                x.LegalSource.Title,
                x.VersionNo,
                x.Source,
                x.Status,
                x.IssuedDate,
                x.EffectiveFrom,
                x.ContentJson != null,
                x.LastError,
                x.CreatedAt
            ))
            .ToListAsync(ct);
        return new(items, query.Page, query.PageSize, total);
    }
}
