using Caps.Workflow.Domain.Workspace;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Application.Abstractions.Documents;
public interface IDocumentVersionRepository
{
    Task<DocumentVersion> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<DocumentVersion>> GetByDocumentIdAsync(Guid documentId, CancellationToken ct = default);
    Task<int> GetNextVersionNoAsync(Guid documentId, CancellationToken ct = default);
    Task AddAsync(DocumentVersion version, CancellationToken ct = default);
}
