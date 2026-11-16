using System.Text.Json;
using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Exceptions;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;

/// <summary>Use case for loading chronological messages in an AI chat conversation.</summary>
public static class GetConversationMessages
{
    /// <summary>Query to retrieve all messages of a conversation owned by the user.</summary>
    public sealed record GetConversationMessagesQuery(Guid ConversationId, Guid UserId);

    /// <summary>Handles loading and deserializing messages and their citations for a conversation.</summary>
    public sealed class GetConversationMessageHandler(
        IConversationRepository conversationRepository,
        IChatMessageRepository chatMessageRepository
    ) : IQueryHandler<GetConversationMessagesQuery, IReadOnlyList<ChatMessageDto>>
    {
        public async Task<IReadOnlyList<ChatMessageDto>> HandleAsync(
            GetConversationMessagesQuery query,
            CancellationToken ct
        )
        {
            var conversation = await conversationRepository.GetByIdAsync(query.ConversationId, ct);

            if (conversation is null)
            {
                throw WorkflowErrors.ConversationNotFound(query.ConversationId);
            }

            if (conversation.UserId != query.UserId)
            {
                throw WorkflowErrors.ConversationAccessDenied();
            }

            var messages = await chatMessageRepository.GetByConversationIdAsync(
                query.ConversationId,
                ct
            );

            return messages
                .Select(m =>
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
                })
                .ToList();
        }
    }
}
