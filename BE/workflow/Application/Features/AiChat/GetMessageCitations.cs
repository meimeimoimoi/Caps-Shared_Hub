using System.Text.Json;
using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Exceptions;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;

/// <summary>Use case for retrieving legal citations referenced by a chat message.</summary>
public static class GetMessageCitations
{
    /// <summary>Query to get the citations of a specific chat message.</summary>
    public sealed record GetMessageCitationsQuery(Guid MessageId, Guid UserId);

    /// <summary>Handles verifying conversation ownership and deserializing message citations.</summary>
    public sealed class GetMessageCitationsHandler(
        IChatMessageRepository chatMessageRepository,
        IConversationRepository conversationRepository
    ) : IQueryHandler<GetMessageCitationsQuery, IReadOnlyList<CitationDto>>
    {
        public async Task<IReadOnlyList<CitationDto>> HandleAsync(
            GetMessageCitationsQuery query,
            CancellationToken ct
        )
        {
            var message = await chatMessageRepository.GetByIdAsync(query.MessageId, ct);

            if (message is null)
            {
                throw WorkflowErrors.MessageNotFound(query.MessageId);
            }

            var conversation = await conversationRepository.GetByIdAsync(
                message.ConversationId,
                ct
            );
            if (conversation is null)
            {
                throw WorkflowErrors.ConversationNotFound(message.ConversationId);
            }

            if (conversation.UserId != query.UserId)
            {
                throw WorkflowErrors.ConversationAccessDenied();
            }

            if (string.IsNullOrWhiteSpace(message.Citations))
            {
                return Array.Empty<CitationDto>();
            }

            return JsonSerializer.Deserialize<List<CitationDto>>(message.Citations) ?? [];
        }
    }
}
