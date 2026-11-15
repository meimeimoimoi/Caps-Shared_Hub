using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for AI chat conversations.</summary>
public sealed class ConversationRepository(WorkflowDbContext dbContext) : IConversationRepository
{
    private readonly DbSet<Conversation> _conversations = dbContext.Set<Conversation>();

    public async Task AddAsync(Conversation conversation, CancellationToken ct = default)
    {
        await _conversations.AddAsync(conversation, ct);
    }

    public async Task<Conversation?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _conversations.FirstOrDefaultAsync(c => c.Id == id, ct);
    }

    public async Task<IReadOnlyList<Conversation>> GetByUserIdAsync(
        Guid userId,
        CancellationToken ct = default
    )
    {
        return await _conversations
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync(ct);
    }
}
