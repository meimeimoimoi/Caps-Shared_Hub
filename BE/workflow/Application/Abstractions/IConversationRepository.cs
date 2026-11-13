using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Repository for managing AI chat conversations.</summary>
public interface IConversationRepository
{
    Task<Conversation?> FindAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Conversation>> ListByUserIdAsync(
        Guid userId,
        CancellationToken ct = default
    );
    void Add(Conversation conversation);

    Task<Conversation?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Conversation>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(Conversation conversation, CancellationToken ct = default);
}
