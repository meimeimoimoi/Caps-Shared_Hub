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
public class DownloadDocumentVersion
{
    public sealed record DownloadDocumentVersionCommand(
        Guid DocumentId,
        Guid VersionId,
        Guid UserId,
        string? Format
    );

    public sealed class DownloadDocumentVersionHandler(
        IDocumentRepository documentRepository,
        IDocumentVersionRepository versionRepository,
        TimeProvider timeProvider
        ) : ICommandHandler<DownloadDocumentVersionCommand, DownloadDocumentResultDto>
    {
        public async Task<DownloadDocumentResultDto> HandleAsync(DownloadDocumentVersionCommand command, CancellationToken ct)
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

            var version = await versionRepository.GetByIdAsync(command.DocumentId, ct);
            if(version is null || version.DocumentId != document.Id)
            {
                throw WorkflowErrors.DocumentVersion_NotFound(command.DocumentId);
            }

            var requestedFormat = (command.Format?.ToLowerInvariant()) switch
            {
                "docx" => "docx",
                _ => "pdf"
            };

            var now = timeProvider.GetUtcNow();
            var expiresAt = now.AddHours(2);
            var token = Guid.NewGuid().ToString("N");
            var safeTitle = string.Concat(document.Title.Split(Path.GetInvalidFileNameChars())).Replace(" ", "_");
            var fileName = $"{safeTitle}_v{version.VersionNo}.{requestedFormat}";

                // Presigned download link pointing to export worker / storage
             var downloadUrl = $"/api/v1/storage/documents/{document.Id}/versions/{version.Id}/export.{requestedFormat}?token={token}&expires={expiresAt.ToUnixTimeSeconds()}";

            return await Task.FromResult(new DownloadDocumentResultDto(
                DownloadUrl: downloadUrl,
                FileName: fileName,
                Format: requestedFormat,
                ContentHash: version.ContentHash,
                ExpiresAt: expiresAt
            ));
        }
    }
}
