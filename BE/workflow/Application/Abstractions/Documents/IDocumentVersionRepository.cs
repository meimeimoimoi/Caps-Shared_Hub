using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions.Documents;

/// <summary>Repository port for document versions.</summary>
public interface IDocumentVersionRepository
{
    Task<DocumentVersion?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<DocumentVersion>> GetByDocumentIdAsync(
        Guid documentId,
        CancellationToken ct = default
    );
    Task<int> GetNextVersionNoAsync(Guid documentId, CancellationToken ct = default);
    Task AddAsync(DocumentVersion version, CancellationToken ct = default);
}
