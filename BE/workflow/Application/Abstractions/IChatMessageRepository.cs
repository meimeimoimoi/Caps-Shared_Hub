using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Repository port for AI conversation chat messages.</summary>
public interface IChatMessageRepository
{
    Task<ChatMessage?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<ChatMessage>> GetByConversationIdAsync(Guid conversationId, CancellationToken ct = default);
    Task<ChatMessage?> GetLatestAnsweredMessageAsync(Guid conversationId, CancellationToken ct = default);
    Task AddAsync(ChatMessage chatMessage, CancellationToken ct = default);
}
