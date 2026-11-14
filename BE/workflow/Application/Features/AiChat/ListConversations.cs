using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using static Caps.Workflow.Application.AiChat.DTOs.ChatDtos;

namespace Caps.Workflow.Application.Features.AiChat;

/// <summary>Use case for listing a user's AI chat conversations.</summary>
public static class ListConversations
{
    /// <summary>Query to retrieve conversation summaries for a user.</summary>
    public sealed record ListConversationsQuery(Guid UserId);

    /// <summary>Handles listing a user's conversations ordered by most recently updated.</summary>
    public sealed class ListConversationsHandler(IConversationRepository conversationRepository)
        : IQueryHandler<ListConversationsQuery, IReadOnlyList<ConversationsSummaryDto>>
    {
        public async Task<IReadOnlyList<ConversationsSummaryDto>> HandleAsync(
            ListConversationsQuery query,
            CancellationToken ct
        )
        {
            var conversations = await conversationRepository.GetByUserIdAsync(query.UserId, ct);

            return conversations
                .Select(c => new ConversationsSummaryDto(
                    c.Id,
                    c.Title ?? string.Empty,
                    c.CreatedAt,
                    c.UpdatedAt
                ))
                .ToList();
        }
    }
}
