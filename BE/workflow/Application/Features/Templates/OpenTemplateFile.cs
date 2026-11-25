using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>The sample Word file of a released template version.</summary>
public sealed record OpenTemplateFileQuery(Guid VersionId);

/// <summary>Streams the file of a published or previously published version, so older drafts still show their layout.</summary>
public sealed class OpenTemplateFileHandler(ITemplateRepository templates, IObjectStorage storage)
    : IQueryHandler<OpenTemplateFileQuery, AttachmentFile>
{
    public async Task<AttachmentFile> HandleAsync(OpenTemplateFileQuery query, CancellationToken ct)
    {
        var version =
            await templates.FindReleasedVersionAsync(query.VersionId, ct)
            ?? throw WorkflowErrors.TemplateNotFound();
        if (version.FileKey is null)
        {
            throw WorkflowErrors.TemplateFileNotFound();
        }
        var content = await storage.OpenAsync(version.FileKey, ct);
        return new(content, ReviewAttachment.Docx, $"template-v{version.VersionNo}.docx");
    }
}
