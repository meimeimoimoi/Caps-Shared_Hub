using System.Text.Json;
using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Features.Documents;

/// <summary>Shared ownership checks, naming, format, and metadata helpers for document version downloads and exports.</summary>
internal static class DocumentExportHelper
{
    public const string Pdf = "pdf";
    public const string Docx = "docx";

    public static async Task<(Document Document, DocumentVersion Version)> LoadOwnedVersionAsync(
        IDocumentRepository documentRepository,
        IDocumentVersionRepository versionRepository,
        Guid documentId,
        Guid versionId,
        Guid userId,
        CancellationToken ct
    )
    {
        var document = await documentRepository.GetByIdAsync(documentId, ct);
        if (document is null)
        {
            throw WorkflowErrors.DocumentNotFound(documentId);
        }

        if (document.OwnerUserId != userId)
        {
            throw WorkflowErrors.DocumentAccessDenied();
        }

        var version = await versionRepository.GetByIdAsync(versionId, ct);
        if (version is null || version.DocumentId != document.Id)
        {
            throw WorkflowErrors.DocumentVersionNotFound(versionId);
        }

        return (document, version);
    }

    public static string NormalizeFormat(string? format) =>
        format?.Trim().ToLowerInvariant() switch
        {
            Docx => Docx,
            _ => Pdf,
        };

    public static string ContentTypeForFormat(string format) =>
        format == Docx
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf";

    public static string BuildExportFileName(string title, int versionNo, string extension)
    {
        var safeTitle = string.Concat(title.Split(Path.GetInvalidFileNameChars()))
            .Trim()
            .Replace(" ", "_");
        if (string.IsNullOrWhiteSpace(safeTitle))
        {
            safeTitle = "document";
        }
        return $"{safeTitle}_v{versionNo}.{extension}";
    }

    public static (string ContentType, string FileName) ReadStoredFileMetadata(
        string contentJson,
        int versionNo
    )
    {
        try
        {
            using var doc = JsonDocument.Parse(contentJson);
            var root = doc.RootElement;
            if (root.ValueKind == JsonValueKind.Object)
            {
                var contentType = ReadString(root, "contentType") ?? "application/octet-stream";
                var fileName = ReadString(root, "fileName") ?? $"document-v{versionNo}";
                return (contentType, fileName);
            }
        }
        catch (JsonException)
        {
            // Fall back to safe defaults if metadata JSON is malformed
        }

        return ("application/octet-stream", $"document-v{versionNo}");
    }

    private static string? ReadString(JsonElement root, string propertyName) =>
        root.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
