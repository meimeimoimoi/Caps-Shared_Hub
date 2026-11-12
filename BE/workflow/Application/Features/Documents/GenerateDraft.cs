using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Use case for generating an AI document draft version via Ollama.</summary>
public static class GenerateDraft
{
    /// <summary>Command to generate a new AI draft version for a document.</summary>
    public sealed record GenerateDraftCommand(
        Guid DocumentId,
        Guid UserId,
        Guid? SnapshotId,
        Guid? TemplateVersionId,
        string? Citations
    );

    /// <summary>Handles resolving the input snapshot, calling Ollama to draft content, hashing, and persisting the new version.</summary>
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
            if (document is null)
            {
                throw WorkflowErrors.Document_NotFound(command.DocumentId);
            }

            if (document.OwnerUserId != command.UserId)
            {
                throw WorkflowErrors.Document_AccessDenied();
            }

            InputSnapshot? snapshot;
            // 1. Resolve snapshot
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
                snapshot = await inputSnapshotRepository.GetLatestByDocumentIdAsync(document.Id, ct);
                if (snapshot is null)
                {
                    throw WorkflowErrors.Snapshot_Required();
                }
            }

            // 2. Load template schema (if a TemplateVersionId is provided) and normalize citations for jsonb
            var templateSchema = command.TemplateVersionId.HasValue
                ? await documentRepository.GetTemplateFieldSchemaAsync(command.TemplateVersionId.Value, ct)
                : null;
            var normalizedCitations = NormalizeJsonb(command.Citations);

            // 3. Generate JSON draft content via Ollama
            var generatedContent = await ollamaDraftService.GenerateDraftAsync(
                title: document.Title,
                periodStart: document.PeriodStart,
                periodEnd: document.PeriodEnd,
                snapshotData: snapshot.Data,
                templateSchema: templateSchema,
                citations: normalizedCitations,
                ct: ct
            );

            // 4. Compute SHA-256 hash of Content
            var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(generatedContent));
            var contentHash = Convert.ToHexString(hashBytes);

            // 5. Resolve next version number & persist
            var nextVersionNo = await documentVersionRepository.GetNextVersionNoAsync(document.Id, ct);
            var now = timeProvider.GetUtcNow();

            var documentVersion = new DocumentVersion
            {
                Id = UuidV7.NewGuid(),
                DocumentId = document.Id,
                VersionNo = nextVersionNo,
                VersionType = "AI_DRAFT",
                InputSnapshotId = snapshot.Id,
                TemplateVersionId = command.TemplateVersionId,
                Citations = normalizedCitations,
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

            await documentVersionRepository.AddAsync(documentVersion, ct);
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

        private static string? NormalizeJsonb(string? raw)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return null;
            }

            var trimmed = raw.Trim();
            try
            {
                using var _ = JsonDocument.Parse(trimmed);
                return trimmed;
            }
            catch (JsonException)
            {
                return JsonSerializer.Serialize(trimmed);
            }
        }
    }
}
