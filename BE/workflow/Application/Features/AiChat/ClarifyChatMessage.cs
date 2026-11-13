using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Exceptions;
using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;
public class ClarifyChatMessage
{
    public sealed record ClarifyChatMessageCommand(
        Guid MessageId,
        Guid UserId,
        string ClarificationText,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd
        );

    public sealed class ClarifyChatMessageHandler(
        IChatMessageRepository chatMessageRepository,
        IConversationRepository conversationRepository,
        IAiQuotaRepository aiQuotaRepository,
        IAiUsageRepository aiUsageRepository,
        IRagQueryClient ragQueryClient,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider
        ) : ICommandHandler<ClarifyChatMessageCommand, SendChatMessageResultDto>
    {
        public async Task<SendChatMessageResultDto> HandleAsync(ClarifyChatMessageCommand command, CancellationToken ct)
        {
            var targetMessage = await chatMessageRepository.GetByIdAsync(command.MessageId, ct);
            if(targetMessage is null)
            {
                throw WorkflowErrors.Messasge_NotFound(command.MessageId);
            }

            if(targetMessage.Sender != ChatMessageSender.AI ||
                targetMessage.AnswerStatus != ChatMessageAnswerStatus.NeedClarification)
            {
                throw WorkflowErrors.InvalidClarificationTarget();
            }

            var conversation = await conversationRepository.GetByIdAsync(targetMessage.ConversationId, ct);
            if(conversation is null)
            {
                throw WorkflowErrors.Conversation_NotFound(targetMessage.ConversationId);
            }

            if(conversation.UserId != command.UserId)
            {
                throw WorkflowErrors.Conversation_AccessDenied();
            }

            var now = timeProvider.GetUtcNow();

            var quota = await aiQuotaRepository.GetByUserIdAsync(command.UserId, ct);
            if(quota is null || !quota.HashAvailableQuota())
            {
                throw WorkflowErrors.QuotaExhausted();
            }

            var effectivePeriodStart = command.PeriodStart ?? targetMessage.PeriodStart;
            var effectivePeriodEnd = command.PeriodEnd ?? targetMessage.PeriodEnd;

            var userClarificationMessage = ChatMessage.CreateUserMessage(
                conversation.Id,
                command.ClarificationText,
                effectivePeriodStart,
                effectivePeriodEnd,
                now
                );

            await chatMessageRepository.AddAsync(userClarificationMessage, ct);

            var ragRequest = new RagQueryRequest(
                conversation.Id,
                Query: targetMessage.Content,
                Clarification: command.ClarificationText,
                PeriodStart: effectivePeriodStart,
                PeriodEnd: effectivePeriodEnd
                );

            var ragResponse = await ragQueryClient.QueryAsync(ragRequest, ct);

            var citationJson = ragResponse.Citations.Count > 0
                ? JsonSerializer.Serialize(ragResponse.Citations)
                : null;

            if(ragResponse.AnswerStatus == ChatMessageAnswerStatus.Answered)
            {
                quota.Deduct(1, now);

                var usage = AiUsage.Create(
                    command.UserId,
                    conversation.Id,
                    userClarificationMessage.Id,
                    AiUsagePaidWith.Quota,
                    creditHold: 0,
                    AiUsageState.Captured,
                    now
                    );
                await aiUsageRepository.AddAsync(usage, ct);
            }

            var aiMessage = ChatMessage.CreateAiMessage(
                conversation.Id,
                ragResponse.Content,
                ragResponse.ScopeResult,
                ragResponse.AnswerStatus,
                ragResponse.PeriodStart ?? effectivePeriodStart,
                ragResponse.PeriodEnd ?? effectivePeriodEnd,
                citationJson,
                now
                );
            await chatMessageRepository.AddAsync(aiMessage, ct);

            conversation.Touch(now);
            await unitOfWork.SaveChangesAsync(ct);

            var userDto = new ChatMessageDto(
                userClarificationMessage.Id,
                userClarificationMessage.ConversationId,
                userClarificationMessage.Sender,
                userClarificationMessage.Content,
                userClarificationMessage.PeriodStart,
                userClarificationMessage.PeriodEnd,
                null,
                null,
                null,
                userClarificationMessage.CreatedAt
                );

            var aiDto = new ChatMessageDto(
                aiMessage.Id,
                aiMessage.ConversationId,
                aiMessage.Sender,
                aiMessage.Content,
                aiMessage.PeriodStart,
                aiMessage.PeriodEnd,
                aiMessage.ScopeResult,
                aiMessage.AnswerStatus,
                ragResponse.Citations,
                aiMessage.CreatedAt
                );

            return new SendChatMessageResultDto(userDto, aiDto, quota.Balance);
        }
    }
}
