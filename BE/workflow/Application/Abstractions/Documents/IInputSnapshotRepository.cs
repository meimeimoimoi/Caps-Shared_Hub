using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.Abstractions.Documents;
public interface IInputSnapshotRepository
{
    Task<InputSnapshot?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<InputSnapshot?> GetLastestByDocumtnIdAsync(Guid documentId, CancellationToken ct = default);
    Task<int> GetNextVersionNoAsync(Guid documetnId, CancellationToken ct = default);
    Task AddAsync(InputSnapshot inputSnapshot, CancellationToken ct = default);
}
