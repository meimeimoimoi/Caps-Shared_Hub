using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;
public class GetDocumentVersionDetail
{
    public sealed record GetDocumentVersionDetailQuery(
        Guid DocumentId,
        Guid VersionId,
        Guid UserId
    );

    public sealed class GetDocumentVersionDetailHandler(
        IDocumentRepository documentRepository,
        IDocumentVersionRepository versionRepository
        ) : IQueryHandler<GetDocumentVersionDetailQuery, DocumentVersionDetailDto>
    {
        public async Task<DocumentVersionDetailDto> HandleAsync(GetDocumentVersionDetailQuery query, CancellationToken ct)
        {
            var document = await documentRepository.GetByIdAsync(query.DocumentId, ct);
            if(document is null)
            {
                throw WorkflowErrors.Document_NotFound(query.DocumentId);
            }

            if(document.OwnerUserId != query.UserId)
            {
                throw WorkflowErrors.Document_AccessDenied();
            }

            var version = await versionRepository.GetByIdAsync(query.VersionId, ct);
            if(version is null || version.DocumentId != document.Id)
            {
                throw WorkflowErrors.DocumentVersion_NotFound(query.VersionId);
            }

            return new DocumentVersionDetailDto(
                version.Id,
                version.DocumentId,
                version.VersionNo,
                version.VersionType,
                version.InputSnapshotId,
                version.TemplateVersionId,
                version.Citations,
                version.DraftAssessment,
                version.Content,
                version.ContentHash,
                version.IsImmutable,
                version.CreatedBy,
                version.CreatedAt
                );
        }
    }
}
