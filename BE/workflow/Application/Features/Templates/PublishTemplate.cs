using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>Publishes a template's draft version.</summary>
public sealed record PublishTemplateCommand(Guid TemplateId);

/// <summary>Publishes the latest version (it must be a draft) and deprecates the one users saw before.</summary>
public sealed class PublishTemplateHandler(ITemplateRepository templates, IUnitOfWork unitOfWork)
    : ICommandHandler<PublishTemplateCommand, TemplateVersionResponse>
{
    public async Task<TemplateVersionResponse> HandleAsync(
        PublishTemplateCommand command,
        CancellationToken ct
    )
    {
        // Every template is saved with a version, so no version means no template
        var draft =
            await templates.FindLatestVersionAsync(command.TemplateId, ct)
            ?? throw WorkflowErrors.TemplateNotFound();
        var current = await templates.FindPublishedVersionAsync(command.TemplateId, ct);
        draft.Publish(current);
        await unitOfWork.SaveChangesAsync(ct);
        return TemplateVersionResponse.From(draft);
    }
}
