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
public class GetMessageCitations
{
    public sealed record GetMessageCitationsQuery(
        Guid MessageId,
        Guid UserId
        );

    public sealed class GetMessageCitationsHandler(
        IChatMessageRepository chatMessageRepository,
        IConversationRepository conversationRepository) : IQueryHandler<GetMessageCitationsQuery, IReadOnlyList<CitationDto>>
    {
        public async Task<IReadOnlyList<CitationDto>> HandleAsync(GetMessageCitationsQuery query, CancellationToken ct)
        {
            var message = await chatMessageRepository.GetByIdAsync( query.MessageId, ct);

            if(message is null)
            {
                throw WorkflowErrors.Messasge_NotFound(query.MessageId);
            }

            var conversation = await conversationRepository.GetByIdAsync(message.ConversationId, ct);
            if(conversation is null)
            {
                throw WorkflowErrors.Conversation_NotFound(message.ConversationId);
            }

            if(conversation.UserId != query.UserId)
            {
                throw WorkflowErrors.Conversation_AccessDenied();
            }

            if (string.IsNullOrWhiteSpace(message.Citations))
            {
                return Array.Empty<CitationDto>();
            }

            return JsonSerializer.Deserialize<List<CitationDto>>(message.Citations) ?? [];
        }
    }
}
