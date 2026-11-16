using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.Features.Documents.DTOs.DocumentDtos;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Use case for resolving the download endpoint and metadata for a document version.</summary>
public static class DownloadDocumentVersion
{
    /// <summary>Command to prepare a download descriptor for a document version (pdf or docx for generated drafts).</summary>
    public sealed record DownloadDocumentVersionCommand(
        Guid DocumentId,
        Guid VersionId,
        Guid UserId,
        string? Format
    );

    /// <summary>Handles verifying document version ownership and returning a gateway-routed file download URL.</summary>
    public sealed class DownloadDocumentVersionHandler(
        IDocumentRepository documentRepository,
        IDocumentVersionRepository versionRepository,
        TimeProvider timeProvider
    ) : ICommandHandler<DownloadDocumentVersionCommand, DownloadDocumentResultDto>
    {
        public async Task<DownloadDocumentResultDto> HandleAsync(
            DownloadDocumentVersionCommand command,
            CancellationToken ct
        )
        {
            var (document, version) = await DocumentExportHelper.LoadOwnedVersionAsync(
                documentRepository,
                versionRepository,
                command.DocumentId,
                command.VersionId,
                command.UserId,
                ct
            );

            var expiresAt = timeProvider.GetUtcNow().AddHours(2);

            if (version.VersionType == Document.ExternalFile)
            {
                var (_, storedFileName) = DocumentExportHelper.ReadStoredFileMetadata(
                    version.Content,
                    version.VersionNo
                );
                var ext = Path.GetExtension(storedFileName).TrimStart('.').ToLowerInvariant();
                var storedFormat = string.IsNullOrWhiteSpace(ext) ? "bin" : ext;
                var storedUrl = $"/api/v1/documents/{document.Id}/versions/{version.Id}/file";

                return new DownloadDocumentResultDto(
                    DownloadUrl: storedUrl,
                    FileName: storedFileName,
                    Format: storedFormat,
                    ContentHash: version.ContentHash,
                    ExpiresAt: expiresAt
                );
            }

            var requestedFormat = DocumentExportHelper.NormalizeFormat(command.Format);
            var fileName = DocumentExportHelper.BuildExportFileName(
                document.Title,
                version.VersionNo,
                requestedFormat
            );
            var downloadUrl =
                $"/api/v1/documents/{document.Id}/versions/{version.Id}/file?format={requestedFormat}";

            return new DownloadDocumentResultDto(
                DownloadUrl: downloadUrl,
                FileName: fileName,
                Format: requestedFormat,
                ContentHash: version.ContentHash,
                ExpiresAt: expiresAt
            );
        }
    }
}
