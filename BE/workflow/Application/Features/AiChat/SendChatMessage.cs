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
public class SendChatMessage
{
    public sealed record SendChatMessageCommand(
        Guid ConversationId,
        Guid UserId,
        string content,
        DateOnly? PeriodStart,
        DateOnly? PeriodEnd);

    public sealed class SendChatMessagehandler(
        IConversationRepository conversationRepository,
        IChatMessageRepository chatMessageRepository,
        IAiQuotaRepository aiQuotaRepository,
        IAiUsageRepository aiUsageRepository,
        IRagQueryClient ragQueryClient,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider
        ) : ICommandHandler<SendChatMessageCommand, SendChatMessageResultDto>
    {
        public async Task<SendChatMessageResultDto> HandleAsync(SendChatMessageCommand command, CancellationToken ct)
        {
            var conversation = await conversationRepository.GetByIdAsync(command.ConversationId, ct);
            if(conversation is null)
            {
                throw WorkflowErrors.Conversation_NotFound(command.ConversationId);
            }
            
            if(conversation.UserId != command.UserId)
            {
                throw WorkflowErrors.Conversation_AccessDenied();
            }

            var now = timeProvider.GetUtcNow();

            // 1. Check or initialize AI Quota
            var quota = await aiQuotaRepository.GetByUserIdAsync(command.UserId, ct);
            if(quota is null)
            {
                quota = AiQuota.Create(command.UserId, 10, now);
                await aiQuotaRepository.AddAsync(quota, ct);
            }

            if (!quota.HashAvailableQuota())
            {
                throw WorkflowErrors.QuotaExhausted();
            }

            // 2. Persist USER chat message
            var userMessage = ChatMessage.CreateUserMessage(
                command.ConversationId,
                command.content,
                command.PeriodStart,
                command.PeriodEnd,
                now
            );
            await chatMessageRepository.AddAsync(userMessage, ct);

            // 3. Query RAG microservice
            var ragRequest = new RagQueryRequest(
                command.ConversationId,
                command.content,
                Clarification: null,
                command.PeriodStart,
                command.PeriodEnd
            );

            var ragResponse = await ragQueryClient.QueryAsync(ragRequest, ct);

            // 4. Quota and AiUsage resolution
            var citationsJson = ragResponse.Citations.Count > 0
                ? JsonSerializer.Serialize(ragResponse.Citations)
                : null;

            if (ragResponse.AnswerStatus == ChatMessageAnswerStatus.Answered)
            {
                quota.Deduct(1, now);

                var usage = AiUsage.Create(
                    command.UserId,
                    command.ConversationId,
                    userMessage.Id,
                    AiUsagePaidWith.Quota,
                    creditHold: 0,
                    AiUsageState.Captured,
                    now
                );
                await aiUsageRepository.AddAsync(usage, ct);
            }

            // 5. Persist AI response message
            var aiMessage = ChatMessage.CreateAiMessage(
                command.ConversationId,
                ragResponse.Content,
                ragResponse.ScopeResult,
                ragResponse.AnswerStatus,
                ragResponse.PeriodStart ?? command.PeriodStart,
                ragResponse.PeriodEnd ?? command.PeriodEnd,
                citationsJson,
                now
            );
            await chatMessageRepository.AddAsync(aiMessage, ct);

            // 6. Update conversation title if needed and touch updated_at
            if (conversation.Title == "New Conversation")
            {
                var autoTitle = command.content.Length > 60
                    ? command.content[..57] + "..."
                    : command.content;
                conversation.UpdateTitle(autoTitle, now);
            }
            else
            {
                conversation.Touch(now);
            }

            await unitOfWork.SaveChangesAsync(ct);

            var userDto = new ChatMessageDto(
                userMessage.Id,
                userMessage.ConversationId,
                userMessage.Sender,
                userMessage.Content,
                userMessage.PeriodStart,
                userMessage.PeriodEnd,
                null,
                null,
                null,
                userMessage.CreatedAt
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
