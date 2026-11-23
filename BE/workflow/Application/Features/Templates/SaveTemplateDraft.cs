using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>An admin's template, identified by its code, with the field schema of its next version.</summary>
public sealed record SaveTemplateDraftCommand(
    Guid UserId,
    string? Code,
    string? Name,
    string? Description,
    string? FieldSchema
);

/// <summary>Creates the template on first use, then saves the schema into its draft version.</summary>
public sealed class SaveTemplateDraftHandler(
    ITemplateRepository templates,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<SaveTemplateDraftCommand, TemplateVersionResponse>
{
    public async Task<TemplateVersionResponse> HandleAsync(
        SaveTemplateDraftCommand command,
        CancellationToken ct
    )
    {
        var now = clock.GetUtcNow();
        // shortcut: two admins creating the same new code at once hit the unique index (500), add a lock if that happens
        var template = await templates.FindByCodeAsync(command.Code?.Trim() ?? "", ct);
        if (template == null)
        {
            template = Template.Create(command.Code, command.Name, command.Description, now);
            templates.Add(template);
        }
        else
        {
            template.Describe(command.Name, command.Description);
        }

        var latest = await templates.FindLatestVersionAsync(template.Id, ct);
        var version = TemplateVersion.SaveDraft(
            template,
            latest,
            command.FieldSchema,
            command.UserId,
            now
        );
        if (version != latest)
            templates.Add(version);
        await unitOfWork.SaveChangesAsync(ct);
        return TemplateVersionResponse.From(version);
    }
}
