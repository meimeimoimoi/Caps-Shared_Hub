using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions.Documents;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Use case for listing a user's document workspaces with pagination and optional status filter.</summary>
public static class GetDocument
{
    /// <summary>Query to retrieve a paginated page of user documents.</summary>
    public sealed record GetDocumentsQuery(Guid UserId, string? Status, int Page, int PageSize);

    /// <summary>Handles querying paginated document workspaces for the user.</summary>
    public sealed class GetDocumentsHandler(IDocumentRepository documentRepository)
        : IQueryHandler<GetDocumentsQuery, PagedResultDto<DocumentSummaryDto>>
    {
        public async Task<PagedResultDto<DocumentSummaryDto>> HandleAsync(
            GetDocumentsQuery query,
            CancellationToken ct
        )
        {
            var safePage = query.Page <= 0 ? 1 : query.Page;
            var safePageSize = query.PageSize is <= 0 or > 100 ? 20 : query.PageSize;

            var (items, totalCount) = await documentRepository.GetPageByUserIdAsync(
                query.UserId,
                query.Status,
                safePage,
                safePageSize,
                ct
            );

            var dtos = items
                .Select(d => new DocumentSummaryDto(
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
                ))
                .ToList();

            return new PagedResultDto<DocumentSummaryDto>(dtos, totalCount, safePage, safePageSize);
        }
    }
}
