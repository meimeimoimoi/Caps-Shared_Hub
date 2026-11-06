using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;
public class ListConversations
{
    public sealed record ListConversationsQuery(Guid userId);

    public sealed class ListConversationsHandler(
        IConversationRepository conversationRepository) : IQueryHandler<ListConversationsQuery, IReadOnlyList<ConversationsSummaryDto>>
    {
        public async Task<IReadOnlyList<ConversationsSummaryDto>> HandleAsync(ListConversationsQuery query, CancellationToken ct)
        {
            var conversations = await conversationRepository.GetByUserIdAsync(query.userId, ct);

            return conversations
            .Select(c => new ConversationsSummaryDto(
                c.Id,
                c.Title,
                c.CreatedAt,
                c.UpdatedAt))
            .ToList();
        }
    }
}
