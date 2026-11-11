using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;
public class GenerateDraft
{
    public sealed record GenerateDraftCommand(
        Guid DocumentId,
        Guid UserId,
        Guid? SnapshotId,
        Guid? TemplateVersionId,
        string? Citations
        );

    public sealed class GenerateDraftHandler(
        IDocumentRepository documentRepository,
        IInputSnapshotRepository inputSnapshotRepository,
        IDocumentVersionRepository documentVersionRepository,
        IOllamaDraftService ollamaDraftService,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider
        ) : ICommandHandler<GenerateDraftCommand, DocumentVersionDetailDto>
    {
        public async Task<DocumentVersionDetailDto> HandleAsync(GenerateDraftCommand command, CancellationToken ct)
        {
            var document = await documentRepository.GetByIdAsync(command.DocumentId, ct);
            if(document is null)
            {
                throw WorkflowErrors.Document_NotFound(command.DocumentId);
            }

            if(document.OwnerUserId != command.UserId)
            {
                throw WorkflowErrors.Document_AccessDenied();
            }

            InputSnapshot? snapshot;
            // 1 resolve snapshot
            if (command.SnapshotId.HasValue)
            {
                snapshot = await inputSnapshotRepository.GetByIdAsync(command.SnapshotId.Value, ct);
                if (snapshot is null || snapshot.DocumentId != document.Id)
                {
                    throw WorkflowErrors.Snapshot_NotFound(command.SnapshotId.Value);
                }
            }
            else
            {
                snapshot = await inputSnapshotRepository.GetLastestByDocumtnIdAsync(document.Id, ct);
                if(snapshot is null)
                {
                    throw WorkflowErrors.Snapshot_Required();
                }
            }

            // 2 Generate JSON draft content via Ollama
            var generatedContent = await ollamaDraftService.GenerateDraftAsync(
                title: document.Title,
                periodStart: document.PeriodStart,
                periodEnd: document.PeriodEnd,
                snapshotData: snapshot.Data,
                templateSchema: null,
                citations: command.Citations,
                ct: ct
                );

            // 3 Compute SHA-256 hash of Content
            var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(generatedContent));
            var contentHash = Convert.ToHexString( hashBytes );

            // 4 Resolve next version number & persist
            var nextVersionNo = await documentVersionRepository.GetNextVersionNoAsync(document.Id, ct);
            var now = DateTime.UtcNow;

            var documentVersion = new DocumentVersion
            {
                Id = UuidV7.NewGuid(),
                DocumentId = document.Id,
                VersionNo = nextVersionNo,
                VersionType = "AI_DRAFT",
                InputSnapshotId = snapshot.Id,
                TemplateVersionId = command.TemplateVersionId,
                Citations = command.Citations,
                DraftAssessment = "AI_GENERATED_PENDING_REVIEW",
                ReviewCaseId = null,
                FileUrl = null,
                Content = generatedContent,
                ContentHash = contentHash,
                IsImmutable = false,
                CreatedBy = command.UserId,
                CreatedAt = now
            };

            document.UpdatedAt = now;

            await documentVersionRepository.AddAsync( documentVersion, ct );
            await unitOfWork.SaveChangesAsync(ct);

            return new DocumentVersionDetailDto(
                documentVersion.Id,
                documentVersion.DocumentId,
                documentVersion.VersionNo,
                documentVersion.VersionType,
                documentVersion.InputSnapshotId,
                documentVersion.TemplateVersionId,
                documentVersion.Citations,
                documentVersion.DraftAssessment,
                documentVersion.Content,
                documentVersion.ContentHash,
                documentVersion.IsImmutable,
                documentVersion.CreatedBy,
                documentVersion.CreatedAt
                );
        }
    }
}
