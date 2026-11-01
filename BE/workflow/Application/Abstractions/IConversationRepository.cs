using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.Abstractions;
public interface IConversationRepository
{
    Task<Conversation?> FindAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Conversation>> ListByUserIdAsync(Guid userId, CancellationToken ct = default);
    void Add(Conversation conversation);
}
