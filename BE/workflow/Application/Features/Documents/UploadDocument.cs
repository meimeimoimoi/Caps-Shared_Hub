using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Use case for creating a document from a file the client uploads.</summary>
public static class UploadDocument
{
    /// <summary>Command to create a document whose first version is the uploaded file.</summary>
    public sealed record UploadDocumentCommand(
        Guid UserId,
        string Title,
        DateOnly PeriodStart,
        DateOnly PeriodEnd,
        string? FileName,
        byte[] Content
    );

    /// <summary>Stores the file, then saves the document; a failed save removes the stored bytes.</summary>
    public sealed class UploadDocumentHandler(
        IDocumentRepository documents,
        IObjectStorage storage,
        IUnitOfWork unitOfWork,
        TimeProvider clock
    ) : ICommandHandler<UploadDocumentCommand, DocumentVersionSummaryDto>
    {
        public async Task<DocumentVersionSummaryDto> HandleAsync(
            UploadDocumentCommand command,
            CancellationToken ct
        )
        {
            var document = Document.Upload(
                command.UserId,
                command.Title,
                command.PeriodStart,
                command.PeriodEnd,
                command.FileName,
                command.Content,
                clock.GetUtcNow()
            );
            var version = document.Versions.Single();
            var contentType = System
                .Text.Json.JsonDocument.Parse(version.Content)
                .RootElement.GetProperty("contentType")
                .GetString()!;

            await storage.PutAsync(version.FileUrl!, command.Content, contentType, ct);
            await documents.AddAsync(document, ct);
            try
            {
                await unitOfWork.SaveChangesAsync(ct);
            }
            catch
            {
                // Nothing points at the stored bytes any more
                await storage.DeleteQuietlyAsync(version.FileUrl!);
                throw;
            }
            return new DocumentVersionSummaryDto(
                version.Id,
                version.DocumentId,
                version.VersionNo,
                version.VersionType,
                version.InputSnapshotId,
                version.TemplateVersionId,
                version.ContentHash,
                version.IsImmutable,
                version.CreatedBy,
                version.CreatedAt
            );
        }
    }
}
