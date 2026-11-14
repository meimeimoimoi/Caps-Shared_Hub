using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions.Documents;

/// <summary>Repository port for immutable form input snapshots of a document.</summary>
public interface IInputSnapshotRepository
{
    Task<InputSnapshot?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<InputSnapshot?> GetLatestByDocumentIdAsync(
        Guid documentId,
        CancellationToken ct = default
    );
    Task<int> GetNextVersionNoAsync(Guid documentId, CancellationToken ct = default);
    Task AddAsync(InputSnapshot inputSnapshot, CancellationToken ct = default);
}
