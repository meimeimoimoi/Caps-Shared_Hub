using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Exceptions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;
public class GetConversationMessages
{
    public sealed record GetConversationMessagesQuery(
        Guid ConversationId,
        Guid UserId);

    public sealed class GetConversationMessageHandler(
        IConversationRepository conversationRepository,
        IChatMessageRepository chatMessageRepository) : IQueryHandler<GetConversationMessagesQuery, IReadOnlyList<ChatMessageDto>>
    {
        public async Task<IReadOnlyList<ChatMessageDto>> HandleAsync(GetConversationMessagesQuery query, CancellationToken ct)
        {
            var conversation = await conversationRepository.GetByIdAsync(query.ConversationId, ct);

            if(conversation is null)
            {
                throw WorkflowErrors.Conversation_NotFound(query.ConversationId);
            }

            if(conversation.UserId != query.UserId)
            {
                throw WorkflowErrors.Conversation_AccessDenied();
            }

            var messages = await chatMessageRepository.GetByCoversationIdAsync(query.ConversationId, ct);

            return messages.Select(m =>
            {
                List<CitationDto>? citations = null;
                if (!string.IsNullOrWhiteSpace(m.Citations))
                {
                    citations = JsonSerializer.Deserialize<List<CitationDto>>(m.Citations);
                }

                return new ChatMessageDto(
                    m.Id,
                    m.ConversationId,
                    m.Sender,
                    m.Content,
                    m.PeriodStart,
                    m.PeriodEnd,
                    m.ScopeResult,
                    m.AnswerStatus,
                    citations,
                    m.CreatedAt
                    );
            }).ToList();

        }

    }
}
