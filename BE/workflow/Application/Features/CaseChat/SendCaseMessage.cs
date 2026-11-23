using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.Application.Features.CaseChat;

/// <summary>A text message from one party of a case to the other.</summary>
public sealed record SendCaseMessageCommand(Guid UserId, Guid ReviewCaseId, string? Content);

/// <summary>
/// Stores the message once the domain has checked the sender, the case status and the text, then pushes it
/// to both parties.
/// </summary>
public sealed class SendCaseMessageHandler(
    IReviewCaseRepository cases,
    ICaseMessageRepository messages,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    ICaseChatNotifier notifier
) : ICommandHandler<SendCaseMessageCommand, CaseMessageResponse>
{
    public async Task<CaseMessageResponse> HandleAsync(
        SendCaseMessageCommand command,
        CancellationToken ct
    )
    {
        var reviewCase =
            await cases.FindAsync(command.ReviewCaseId, ct)
            ?? throw WorkflowErrors.ReviewCaseNotFound();
        var message = CaseMessage.Post(
            reviewCase,
            command.UserId,
            command.Content,
            clock.GetUtcNow()
        );
        messages.Add(message);
        await unitOfWork.SaveChangesAsync(ct);
        var response = CaseMessageResponse.From(message);
        // The sender too, so their other tabs show the message
        await notifier.MessageCreatedAsync(
            reviewCase.Id,
            [reviewCase.RequesterUserId, reviewCase.ExpertUserId],
            response,
            ct
        );
        return response;
    }
}
