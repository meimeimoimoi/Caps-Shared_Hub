using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Use case for listing all versions of a document.</summary>
public static class GetDocumentVersions
{
    /// <summary>Query to retrieve the version history of a document.</summary>
    public sealed record GetDocumentVersionsQuery(Guid DocumentId, Guid UserId);

    /// <summary>Handles verifying document ownership and returning version summaries.</summary>
    public sealed class GetDocumentVersionHandler(
        IDocumentRepository documentRepository,
        IDocumentVersionRepository versionRepository
    ) : IQueryHandler<GetDocumentVersionsQuery, IReadOnlyList<DocumentVersionSummaryDto>>
    {
        public async Task<IReadOnlyList<DocumentVersionSummaryDto>> HandleAsync(
            GetDocumentVersionsQuery query,
            CancellationToken ct
        )
        {
            var document = await documentRepository.GetByIdAsync(query.DocumentId, ct);
            if (document is null)
            {
                throw WorkflowErrors.DocumentNotFound(query.DocumentId);
            }

            if (document.OwnerUserId != query.UserId)
            {
                throw WorkflowErrors.DocumentAccessDenied();
            }

            var versions = await versionRepository.GetByDocumentIdAsync(query.DocumentId, ct);

            return versions
                .Select(v => new DocumentVersionSummaryDto(
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
                ))
                .ToList();
        }
    }
}
