using System.Text.Json;
using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Attachments;

/// <summary>The file of the version under review, for a party or (UserId null) a system admin handling a dispute.</summary>
public sealed record OpenSourceFileQuery(Guid? UserId, Guid ReviewCaseId);

/// <summary>Streams the uploaded file the case reviews; a version built in the app has no file, so it is not found.</summary>
public sealed class OpenSourceFileHandler(
    IReviewCaseRepository cases,
    IReviewAttachmentRepository attachments,
    IObjectStorage storage
) : IQueryHandler<OpenSourceFileQuery, AttachmentFile>
{
    public async Task<AttachmentFile> HandleAsync(OpenSourceFileQuery query, CancellationToken ct)
    {
        var reviewCase =
            await cases.FindAsync(query.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        if (query.UserId is { } userId)
        {
            reviewCase.EnsureVisibleTo(userId);
        }
        var version = await attachments.FindSourceAsync(reviewCase.SourceVersionId, ct);
        if (version?.FileUrl is not { } key)
        {
            throw WorkflowErrors.AttachmentNotFound();
        }
        // The upload recorded the name and the type it detected from the bytes
        var meta = JsonDocument.Parse(version.Content).RootElement;
        var content = await storage.OpenAsync(key, ct);
        return new(
            content,
            Text(meta, "contentType") ?? "application/octet-stream",
            Text(meta, "fileName") ?? $"document-v{version.VersionNo}"
        );
    }

    private static string? Text(JsonElement meta, string name) =>
        meta.ValueKind == JsonValueKind.Object
        && meta.TryGetProperty(name, out var value)
        && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;
}
