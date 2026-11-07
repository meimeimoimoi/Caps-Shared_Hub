using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;
public sealed class ChatMessageRepository(DbContext dbContext) : IChatMessageRepository
{
    private readonly DbSet<ChatMessage> _messages = dbContext.Set<ChatMessage>();
    public async Task AddAsync(ChatMessage chatMessage, CancellationToken ct = default)
    {
        await _messages.AddAsync(chatMessage);
    }

    public async Task<IReadOnlyList<ChatMessage>> GetByCoversationIdAsync(Guid conversationId, CancellationToken ct = default)
    {
        return await _messages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();
    }

    public async Task<ChatMessage?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _messages.FirstOrDefaultAsync(m => m.Id == id, ct);
    }

    public async Task<ChatMessage?> GetLatestAnsweredMessageAsync(Guid conversationId, CancellationToken ct = default)
    {
        return await _messages
            .Where(m => m.ConversationId == conversationId
                            && m.Sender == ChatMessageAnswerStatus.Answered)
            .OrderByDescending(m => m.CreatedAt)
            .FirstOrDefaultAsync(ct);
    }
}
