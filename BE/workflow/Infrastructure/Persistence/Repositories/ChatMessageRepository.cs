using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for AI conversation chat messages.</summary>
public sealed class ChatMessageRepository(WorkflowDbContext dbContext) : IChatMessageRepository
{
    private readonly DbSet<ChatMessage> _messages = dbContext.Set<ChatMessage>();

    public async Task AddAsync(ChatMessage chatMessage, CancellationToken ct = default)
    {
        await _messages.AddAsync(chatMessage, ct);
    }

    public async Task<IReadOnlyList<ChatMessage>> GetByConversationIdAsync(
        Guid conversationId,
        CancellationToken ct = default
    )
    {
        return await _messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync(ct);
    }

    public async Task<ChatMessage?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _messages.FirstOrDefaultAsync(m => m.Id == id, ct);
    }

    public async Task<ChatMessage?> GetLatestAnsweredMessageAsync(
        Guid conversationId,
        CancellationToken ct = default
    )
    {
        return await _messages
            .AsNoTracking()
            .Where(m =>
                m.ConversationId == conversationId
                && m.Sender == ChatMessageSender.AI
                && m.AnswerStatus == ChatMessageAnswerStatus.Answered
            )
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }
}
