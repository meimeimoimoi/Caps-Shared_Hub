using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;

namespace Caps.Workflow.Application.Features.Attachments;

/// <summary>A party uploads one file to the case.</summary>
public sealed record AddAttachmentCommand(
    Guid UserId,
    Guid ReviewCaseId,
    string? FileName,
    byte[] Content
);

/// <summary>Checks the file by its bytes, stores it, then records it; a failed save removes the stored bytes.</summary>
public sealed class AddAttachmentHandler(
    IReviewCaseRepository cases,
    IReviewAttachmentRepository attchments,
    IObjectStorage storage,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<AddAttachmentCommand, AttachmentResponse>
{
    public async Task<AttachmentResponse> HandleAsync(
        AddAttachmentCommand command,
        CancellationToken ct
    )
    {
        // The row lock serizlizes uploads, so two at once cannot both slip under the per-case limit
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var reviewCase =
            await cases.FindForUpdateAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        var count = await attchments.CountAsync(reviewCase.Id, ct);
        var attachment = reviewCase.AddAttachment(
            command.UserId,
            command.FileName,
            command.Content,
            count,
            clock.GetUtcNow()
        );

        await storage.PutAsync(attachment.FileUrl, command.Content, attachment.ContentType, ct);
        attchments.Add(attachment);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            //Nothing points at the stored bytes any more
            await storage.DeleteQuietlyAsync(attachment.FileUrl);
            throw;
        }
        return AttachmentResponse.From(attachment);
    }
}
