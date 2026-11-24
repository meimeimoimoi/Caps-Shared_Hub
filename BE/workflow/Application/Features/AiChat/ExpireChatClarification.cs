using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Features.AiChat;

/// <summary>The clarification expiry job's step for one overdue NEED_CLARIFICATION AI message.</summary>
public sealed record ExpireChatClarificationCommand(Guid MessageId);

/// <summary>
/// Closes an overdue clarification prompt (past its 24-hour deadline) with INSUFFICIENT_INFORMATION
/// and closure reason USER_DID_NOT_CLARIFY, releasing any still-reserved credit while leaving captured credit intact.
/// </summary>
public sealed class ExpireChatClarificationHandler(
    IChatMessageRepository chatMessageRepository,
    IConversationRepository conversationRepository,
    AiCreditChargeService aiCreditChargeService,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider
) : ICommandHandler<ExpireChatClarificationCommand>
{
    public async Task HandleAsync(ExpireChatClarificationCommand command, CancellationToken ct)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var targetMessage = await chatMessageRepository.FindForUpdateAsync(command.MessageId, ct);
        var now = timeProvider.GetUtcNow();
        if (targetMessage?.IsClarificationOverdue(now) != true)
        {
            return;
        }

        var history = await chatMessageRepository.GetByConversationIdAsync(
            targetMessage.ConversationId,
            ct
        );
        var (rootQuestion, threadMessages) =
            ClarifyChatMessage.ClarifyChatMessageHandler.ResolveQuestionThread(
                history,
                targetMessage
            );
        var rootQuestionId = rootQuestion?.Id ?? targetMessage.RootQuestionId;

        var prompts = threadMessages
            .Where(m =>
                m.Sender == ChatMessageSender.AI
                && m.AnswerStatus == ChatMessageAnswerStatus.NeedClarification
            )
            .Select(m => m.Content)
            .ToList();
        if (!prompts.Contains(targetMessage.Content, StringComparer.Ordinal))
        {
            prompts.Add(targetMessage.Content);
        }

        var userClarifications = threadMessages
            .Where(m => m.Sender == ChatMessageSender.User && m.Id != rootQuestionId)
            .Select(m => m.Content)
            .ToList();

        var missingSummary = ChatMessage.BuildMissingInformationSummary(
            rootQuestion?.Content,
            prompts,
            userClarifications
        );
        var closedMessage = ChatMessage.CreateInsufficientInformationMessage(
            targetMessage.ConversationId,
            rootQuestionId,
            Math.Max(targetMessage.ClarificationRound, 1),
            ChatMessageClosureReason.UserDidNotClarify,
            missingSummary,
            targetMessage.PeriodStart,
            targetMessage.PeriodEnd,
            now
        );

        var threadQuestionIds = threadMessages
            .Where(m => m.Sender == ChatMessageSender.User)
            .Select(m => m.Id)
            .Distinct()
            .ToList();
        if (rootQuestionId.HasValue && !threadQuestionIds.Contains(rootQuestionId.Value))
        {
            threadQuestionIds.Add(rootQuestionId.Value);
        }

        // Release any uncaptured hold before committing so billing failure leaves the prompt overdue for retry.
        await aiCreditChargeService.ReleaseReservedUsagesForQuestionAsync(
            threadQuestionIds,
            "AI chat INSUFFICIENT_INFORMATION (USER_DID_NOT_CLARIFY)",
            now,
            ct
        );

        targetMessage.MarkClarificationResolved(now);
        await chatMessageRepository.AddAsync(closedMessage, ct);

        var conversation = await conversationRepository.GetByIdAsync(
            targetMessage.ConversationId,
            ct
        );
        conversation?.Touch(now);

        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }
}
