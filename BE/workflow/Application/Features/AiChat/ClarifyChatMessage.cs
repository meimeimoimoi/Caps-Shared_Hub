using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;

/// <summary>Use case for providing clarification details in response to an AI message.</summary>
public static class ClarifyChatMessage
{
    /// <summary>Command to clarify an AI message awaiting additional period or context information.</summary>
    public sealed record ClarifyChatMessageCommand(
        Guid MessageId,
        Guid UserId,
        string ClarificationText,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd
    );

    /// <summary>Handles clarifying a previous question within the 2-round / 24-hour limits and storing the result.</summary>
    public sealed class ClarifyChatMessageHandler(
        IChatMessageRepository chatMessageRepository,
        IConversationRepository conversationRepository,
        IRagQueryClient ragQueryClient,
        AiCreditChargeService aiCreditChargeService,
        AiBillingSettings aiBillingSettings,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider
    ) : ICommandHandler<ClarifyChatMessageCommand, SendChatMessageResultDto>
    {
        public async Task<SendChatMessageResultDto> HandleAsync(
            ClarifyChatMessageCommand command,
            CancellationToken ct
        )
        {
            var targetMessage = await chatMessageRepository.GetByIdAsync(command.MessageId, ct);
            if (targetMessage is null)
            {
                throw WorkflowErrors.MessageNotFound(command.MessageId);
            }

            if (!targetMessage.IsAwaitingClarification)
            {
                throw WorkflowErrors.InvalidClarificationTarget();
            }

            var conversation = await conversationRepository.GetByIdAsync(
                targetMessage.ConversationId,
                ct
            );
            if (conversation is null)
            {
                throw WorkflowErrors.ConversationNotFound(targetMessage.ConversationId);
            }

            if (conversation.UserId != command.UserId)
            {
                throw WorkflowErrors.ConversationAccessDenied();
            }

            var now = timeProvider.GetUtcNow();
            var history = await chatMessageRepository.GetByConversationIdAsync(conversation.Id, ct);
            var (rootQuestion, threadMessages) = ResolveQuestionThread(history, targetMessage);
            var rootQuestionId = rootQuestion?.Id ?? targetMessage.RootQuestionId;
            var originalUserQuery = rootQuestion?.Content ?? targetMessage.Content;

            var priorPrompts = threadMessages
                .Where(m =>
                    m.Sender == ChatMessageSender.AI
                    && m.AnswerStatus == ChatMessageAnswerStatus.NeedClarification
                )
                .Select(m => m.Content)
                .ToList();
            if (!priorPrompts.Contains(targetMessage.Content, StringComparer.Ordinal))
            {
                priorPrompts.Add(targetMessage.Content);
            }

            var priorUserClarifications = threadMessages
                .Where(m => m.Sender == ChatMessageSender.User && m.Id != rootQuestionId)
                .Select(m => m.Content)
                .ToList();

            var threadQuestionIds = threadMessages
                .Where(m => m.Sender == ChatMessageSender.User)
                .Select(m => m.Id)
                .Distinct()
                .ToList();
            if (rootQuestionId.HasValue && !threadQuestionIds.Contains(rootQuestionId.Value))
            {
                threadQuestionIds.Add(rootQuestionId.Value);
            }

            // Enforce the 24-hour clarification deadline even if the background expiry job has not ticked yet (BR-C22).
            if (targetMessage.IsClarificationOverdue(now))
            {
                var missingSummary = ChatMessage.BuildMissingInformationSummary(
                    originalUserQuery,
                    priorPrompts,
                    priorUserClarifications
                );
                var closedMessage = ChatMessage.CreateInsufficientInformationMessage(
                    conversation.Id,
                    rootQuestionId,
                    Math.Max(targetMessage.ClarificationRound, 1),
                    ChatMessageClosureReason.UserDidNotClarify,
                    missingSummary,
                    targetMessage.PeriodStart,
                    targetMessage.PeriodEnd,
                    now
                );

                await using var tx = await unitOfWork.BeginTransactionAsync(ct);
                targetMessage.MarkClarificationResolved(now);
                await chatMessageRepository.AddAsync(closedMessage, ct);
                conversation.Touch(now);
                await aiCreditChargeService.ReleaseReservedUsagesForQuestionAsync(
                    threadQuestionIds,
                    "AI chat INSUFFICIENT_INFORMATION (USER_DID_NOT_CLARIFY)",
                    now,
                    ct
                );
                await unitOfWork.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);

                throw WorkflowErrors.ClarificationExpired();
            }

            var effectivePeriodStart = command.PeriodStart ?? targetMessage.PeriodStart;
            var effectivePeriodEnd = command.PeriodEnd ?? targetMessage.PeriodEnd;

            var userClarificationMessage = ChatMessage.CreateUserMessage(
                conversation.Id,
                command.ClarificationText,
                effectivePeriodStart,
                effectivePeriodEnd,
                now,
                rootQuestionId: rootQuestionId
            );

            var allClarifications = priorUserClarifications
                .Append(command.ClarificationText)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .ToList();
            var combinedClarification =
                allClarifications.Count == 1
                    ? allClarifications[0]
                    : string.Join("\n", allClarifications);

            var ragRequest = new RagQueryRequest(
                conversation.Id,
                Query: originalUserQuery,
                Clarification: combinedClarification,
                PeriodStart: effectivePeriodStart,
                PeriodEnd: effectivePeriodEnd
            );

            return await ChatTurnRunner.RunAsync(
                conversation,
                command.UserId,
                userClarificationMessage,
                ragRequest,
                updateTitleWhenNew: false,
                chatMessageRepository,
                ragQueryClient,
                aiCreditChargeService,
                aiBillingSettings,
                unitOfWork,
                timeProvider,
                ct,
                clarifiedTarget: targetMessage,
                rootQuestionId: rootQuestionId,
                priorClarificationPrompts: priorPrompts,
                priorUserClarifications: allClarifications,
                threadQuestionIds: threadQuestionIds
            );
        }

        internal static (
            ChatMessage? RootQuestion,
            IReadOnlyList<ChatMessage> ThreadMessages
        ) ResolveQuestionThread(IReadOnlyList<ChatMessage> history, ChatMessage targetMessage)
        {
            if (targetMessage.RootQuestionId is { } rootId)
            {
                var root = history.FirstOrDefault(m => m.Id == rootId);
                var thread = history
                    .Where(m => m.Id == rootId || m.RootQuestionId == rootId)
                    .OrderBy(m => m.CreatedAt)
                    .ToList();
                return (root, thread);
            }

            var fallbackRoot = history
                .Where(m =>
                    m.Sender == ChatMessageSender.User && m.CreatedAt <= targetMessage.CreatedAt
                )
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefault();

            var fallbackThread = new List<ChatMessage>();
            if (fallbackRoot is not null)
            {
                fallbackThread.Add(fallbackRoot);
            }
            fallbackThread.Add(targetMessage);
            return (fallbackRoot, fallbackThread);
        }
    }
}
