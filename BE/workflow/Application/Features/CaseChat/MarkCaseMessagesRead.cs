using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.CaseChat;

/// <summary>The caller has read the case's messages up to and including this one.</summary>
public sealed record MarkCaseMessagesReadCommand(
    Guid UserId,
    Guid ReviewCaseId,
    Guid LastMessageId
);

/// <summary>Moves the caller's read marker forward; it never moves back.</summary>
public sealed class MarkCaseMessagesReadHandler(
    IReviewCaseRepository cases,
    ICaseMessageRepository messages,
    ICaseReadMarkerRepository markers,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<MarkCaseMessagesReadCommand>
{
    public async Task HandleAsync(MarkCaseMessagesReadCommand command, CancellationToken ct)
    {
        var reviewCase =
            await cases.FindAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        reviewCase.ParticipantRoleOf(command.UserId);
        var message =
            await messages.FindAsync(reviewCase.Id, command.LastMessageId, ct)
            ?? throw WorkflowErrors.MessageNotFound();
        var now = clock.GetUtcNow();
        var marker = await markers.FindAsync(reviewCase.Id, command.UserId, ct);
        if (marker is null)
            markers.Add(CaseReadMarker.Start(reviewCase.Id, command.UserId, message, now));
        else
            marker.MoveTo(message, now);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // Another tab created the marker first; the client marks again on its next read
        }
    }
}
