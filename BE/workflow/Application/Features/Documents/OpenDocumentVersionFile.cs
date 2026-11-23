using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Use case for streaming or exporting the file of a document version owned by the caller.</summary>
public static class OpenDocumentVersionFile
{
    /// <summary>Query to open a stored file or export an AI/expert draft version as PDF or DOCX.</summary>
    public sealed record OpenDocumentVersionFileQuery(
        Guid DocumentId,
        Guid VersionId,
        Guid UserId,
        string? Format
    );

    /// <summary>Verifies document ownership and returns either the uploaded file stream or generated PDF/DOCX bytes.</summary>
    public sealed class OpenDocumentVersionFileHandler(
        IDocumentRepository documentRepository,
        IDocumentVersionRepository versionRepository,
        IObjectStorage objectStorage,
        IDocumentFileExporter fileExporter
    ) : IQueryHandler<OpenDocumentVersionFileQuery, AttachmentFile>
    {
        public async Task<AttachmentFile> HandleAsync(
            OpenDocumentVersionFileQuery query,
            CancellationToken ct
        )
        {
            var (document, version) = await DocumentExportHelper.LoadOwnedVersionAsync(
                documentRepository,
                versionRepository,
                query.DocumentId,
                query.VersionId,
                query.UserId,
                ct
            );

            if (version.VersionType == Document.ExternalFile)
            {
                if (version.FileUrl is not { } storageKey)
                {
                    throw Domain.WorkflowErrors.AttachmentNotFound();
                }

                var (storedContentType, storedFileName) =
                    DocumentExportHelper.ReadStoredFileMetadata(version.Content, version.VersionNo);
                var stream = await objectStorage.OpenAsync(storageKey, ct);
                return new AttachmentFile(stream, storedContentType, storedFileName);
            }

            var format = DocumentExportHelper.NormalizeFormat(query.Format);
            var bytes = fileExporter.Export(document, version, format);
            var fileName = DocumentExportHelper.BuildExportFileName(
                document.Title,
                version.VersionNo,
                format
            );
            var contentType = DocumentExportHelper.ContentTypeForFormat(format);

            return new AttachmentFile(new MemoryStream(bytes), contentType, fileName);
        }
    }
}
