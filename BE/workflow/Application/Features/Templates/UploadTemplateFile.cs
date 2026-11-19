using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.Templates;

/// <summary>An admin uploads the sample Word file of a template's draft version.</summary>
public sealed record UploadTemplateFileCommand(Guid TemplateId, byte[] Content);

/// <summary>Stores the file, then points the draft at it; a failed save removes the new bytes, a good one the old.</summary>
public sealed class UploadTemplateFileHandler(
    ITemplateRepository templates,
    IObjectStorage storage,
    IUnitOfWork unitOfWork
) : ICommandHandler<UploadTemplateFileCommand, TemplateVersionResponse>
{
    public async Task<TemplateVersionResponse> HandleAsync(
        UploadTemplateFileCommand command,
        CancellationToken ct
    )
    {
        // Every template is saved with a version, so no version means no template
        var draft =
            await templates.FindLatestVersionAsync(command.TemplateId, ct)
            ?? throw WorkflowErrors.TemplateNotFound();
        var previous = draft.AttachFile(command.Content);

        await storage.PutAsync(draft.FileKey!, command.Content, ReviewAttachment.Docx, ct);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch
        {
            // Nothing points at the stored bytes any more
            await storage.DeleteQuietlyAsync(draft.FileKey!);
            throw;
        }
        if (previous != null)
        {
            await storage.DeleteQuietlyAsync(previous);
        }
        return TemplateVersionResponse.From(draft);
    }
}
