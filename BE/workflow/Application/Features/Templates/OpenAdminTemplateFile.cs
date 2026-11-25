using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>The sample Word file of any version of a template, drafts included, for admins checking it.</summary>
public sealed record OpenAdminTemplateFileQuery(Guid TemplateId, Guid VersionId);

/// <summary>Streams the file; a version of another template is not found.</summary>
public sealed class OpenAdminTemplateFileHandler(
    ITemplateRepository templates,
    IObjectStorage storage
) : IQueryHandler<OpenAdminTemplateFileQuery, AttachmentFile>
{
    public async Task<AttachmentFile> HandleAsync(
        OpenAdminTemplateFileQuery query,
        CancellationToken ct
    )
    {
        var template =
            await templates.FindWithVersionsAsync(query.TemplateId, ct)
            ?? throw WorkflowErrors.TemplateNotFound();
        var version =
            template.Versions.FirstOrDefault(v => v.Id == query.VersionId)
            ?? throw WorkflowErrors.TemplateNotFound();
        if (version.FileKey is null)
        {
            throw WorkflowErrors.TemplateFileNotFound();
        }
        var content = await storage.OpenAsync(version.FileKey, ct);
        return new(content, ReviewAttachment.Docx, $"template-v{version.VersionNo}.docx");
    }
}
