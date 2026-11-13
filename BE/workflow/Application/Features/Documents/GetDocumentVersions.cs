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
public class GetDocumentVersions
{
    public sealed record GetDocumentVersionsQuery(
        Guid DocumentId,
        Guid UserId
        );

    public sealed class GetDocumentVersionHandler(
        IDocumentRepository documentRepository,
        IDocumentVersionRepository versionRepository
        ) : IQueryHandler<GetDocumentVersionsQuery, IReadOnlyList<DocumentVersionSummaryDto>>
    {
        public async Task<IReadOnlyList<DocumentVersionSummaryDto>> HandleAsync(GetDocumentVersionsQuery query, CancellationToken ct)
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

            var versions = await versionRepository.GetByDocumentIdAsync(query.DocumentId, ct);

            return versions.Select(v => new DocumentVersionSummaryDto(
                v.Id,
                v.DocumentId,
                v.VersionNo,
                v.VersionType,
                v.InputSnapshotId,
                v.TemplateVersionId,
                v.ContentHash,
                v.IsImmutable,
                v.CreatedBy,
                v.CreatedAt
                )).ToList();

        }
    }
}
