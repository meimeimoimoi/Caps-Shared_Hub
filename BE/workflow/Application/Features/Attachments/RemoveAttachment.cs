using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Attachments;

/// <summary>A party takes back a file they uploaded by mistake.</summary>
public sealed record RemoveAttachmentCommand(Guid UserId, Guid ReviewCaseId, Guid AttachmentId);

/// <summary>Removes the record first, then the stored bytes, so a failed save never leaves a row without its file.</summary>
public sealed class RemoveAttachmentHandler(
    IReviewCaseRepository cases,
    IReviewAttachmentRepository attachments,
    IObjectStorage storage,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<RemoveAttachmentCommand>
{
    public async Task HandleAsync(RemoveAttachmentCommand command, CancellationToken ct)
    {
        var reviewCase =
            await cases.FindAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        var attachment =
            await attachments.FindAsync(reviewCase.Id, command.AttachmentId, ct)
            ?? throw WorkflowErrors.AttachmentNotFound();
        reviewCase.EnsureAttachmentRemovable(command.UserId, attachment, clock.GetUtcNow());
        attachments.Remove(attachment);
        await unitOfWork.SaveChangesAsync(ct);
        await storage.DeleteQuietlyAsync(attachment.FileUrl);
    }
}
