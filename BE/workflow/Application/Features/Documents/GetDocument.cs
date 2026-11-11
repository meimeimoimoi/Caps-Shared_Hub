using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions.Documents;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;
public sealed class GetDocument
{
    public sealed record GetDocumentsQuery(
        Guid UserId,
        string? Status,
        int Page,
        int PageSize
        );

    public sealed class GetDocumentsHandler(
        IDocumentRepository documentRepository
        ) : IQueryHandler<GetDocumentsQuery, PagedResultDto<DocumentSummaryDto>>
    {
        public async Task<PagedResultDto<DocumentSummaryDto>> HandleAsync(GetDocumentsQuery query, CancellationToken ct)
        {
            var safePage = query.Page <= 0 ? 1 : query.Page;
            var safePageSize = query.PageSize is <= 0 or 100 ? 20 : query.PageSize;

            var (items, totalCount) = await documentRepository.GetPageByUserIdAsync(
                query.UserId,
                query.Status,
                safePage,
                safePageSize,
                ct
                );

            var dtos = items.Select(d => new DocumentSummaryDto(
                d.Id,
                d.OwnerUserId,
                d.Source,
                d.TemplateId,
                d.Title,
                d.PeriodStart,
                d.PeriodEnd,
                d.Status,
                d.VerifiedVersionId,
                d.CreatedAt,
                d.UpdatedAt
                )).ToList();

            return new PagedResultDto<DocumentSummaryDto>(dtos, totalCount, safePage, safePageSize);

        }
    }
}
