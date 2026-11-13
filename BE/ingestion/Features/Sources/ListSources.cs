using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Sources;

/// <summary>One page of the legal source catalog.</summary>
/// <param name="Q">Part of the document number or title, case-insensitive.</param>
/// <param name="DocType">Exact document type, e.g. Thông tư.</param>
public sealed record ListSourcesQuery(string? Q, string? DocType, int Page, int PageSize);

/// <summary>Searches legal sources by number or title, ordered by document number.</summary>
public sealed class ListSourcesHandler(IngestionDbContext db)
    : IQueryHandler<ListSourcesQuery, PageResponse<LegalSourceResponse>>
{
    private static readonly string[] ApprovedStatuses =
    [
        DocumentStatuses.Approved,
        DocumentStatuses.Indexed,
    ];

    public async Task<PageResponse<LegalSourceResponse>> HandleAsync(
        ListSourcesQuery query,
        CancellationToken ct
    )
    {
        Paging.Ensure(query.Page, query.PageSize);
        var sources = db.LegalSources.AsQueryable();
        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var pattern = $"%{EscapeLike(query.Q.Trim())}%";
            sources = sources.Where(x =>
                EF.Functions.ILike(x.DocumentNumber, pattern, @"\")
                || EF.Functions.ILike(x.Title, pattern, @"\")
            );
        }
        if (!string.IsNullOrWhiteSpace(query.DocType))
        {
            var docType = query.DocType.Trim();
            sources = sources.Where(x => x.DocType == docType);
        }

        var total = await sources.CountAsync(ct);
        var rows = await sources
            .OrderBy(x => x.DocumentNumber)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(x => new
            {
                x.Id,
                x.DocumentNumber,
                x.DocType,
                x.IssuingAuthority,
                x.Title,
                Latest = x
                    .KnowledgeDocuments.Where(d => ApprovedStatuses.Contains(d.Status))
                    .OrderByDescending(d => d.VersionNo)
                    .Select(d => new { d.EffectiveFrom, d.EffectiveTo })
                    .FirstOrDefault(),
                Amends = x
                    .AmendingAmendments.Select(a => new AmendmentLinkResponse(
                        a.AmendedSourceId,
                        a.AmendedSource.DocumentNumber,
                        a.RelationType
                    ))
                    .ToList(),
                AmendedBy = x
                    .AmendedAmendments.Select(a => new AmendmentLinkResponse(
                        a.AmendingSourceId,
                        a.AmendingSource.DocumentNumber,
                        a.RelationType
                    ))
                    .ToList(),
            })
            .AsSplitQuery()
            .ToListAsync(ct);
        var items = rows.ConvertAll(x => new LegalSourceResponse(
            x.Id,
            x.DocumentNumber,
            x.DocType,
            x.IssuingAuthority,
            x.Title,
            x.Latest?.EffectiveFrom,
            x.Latest?.EffectiveTo,
            x.Amends,
            x.AmendedBy
        ));
        return new(items, query.Page, query.PageSize, total);
    }

    // The user's text is matched literally: % and _ are not wildcards
    private static string EscapeLike(string value) =>
        value.Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");
}
