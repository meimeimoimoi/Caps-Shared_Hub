using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Reads display information for one owned document.</summary>
public sealed record GetDocumentSummaryQuery(Guid DocumentId, Guid UserId);

public sealed class GetDocumentSummaryHandler(IDocumentRepository documents)
    : IQueryHandler<GetDocumentSummaryQuery, DocumentSummaryDto>
{
    public async Task<DocumentSummaryDto> HandleAsync(
        GetDocumentSummaryQuery query,
        CancellationToken ct
    )
    {
        var document = await documents.GetByIdAsync(query.DocumentId, ct);
        if (document is null)
            throw WorkflowErrors.DocumentNotFound(query.DocumentId);
        if (document.OwnerUserId != query.UserId)
            throw WorkflowErrors.DocumentAccessDenied();

        return new DocumentSummaryDto(
            document.Id,
            document.OwnerUserId,
            document.Source,
            document.TemplateId,
            document.Title,
            document.PeriodStart,
            document.PeriodEnd,
            document.Status,
            document.VerifiedVersionId,
            document.CreatedAt,
            document.UpdatedAt
        )
        {
            PinnedTemplateVersionId = DocumentSummaryDto.ReadPinnedTemplateVersion(
                document.Metadata
            ),
        };
    }
}
