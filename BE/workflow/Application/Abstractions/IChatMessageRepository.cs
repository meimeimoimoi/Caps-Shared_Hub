using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.Abstractions;
public interface IChatMessageRepository
{
    Task<ChatMessage?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<ChatMessage>> GetByCoversationIdAsync(Guid conversationId, CancellationToken ct = default);
    Task<ChatMessage?> GetLatestAnsweredMessageAsync(Guid conversationId, CancellationToken ct = default);
    Task AddAsync(ChatMessage chatMessage, CancellationToken ct = default);
}
