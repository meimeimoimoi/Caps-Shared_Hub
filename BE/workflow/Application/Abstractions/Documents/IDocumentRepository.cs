using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions.Documents;
public interface IDocumentRepository
{
    Task<Document?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<(IReadOnlyList<Document> Items, int TotalCount)> GetPageByUserIdAsync(
        Guid userId,
        string? status,
        int page,
        int pageSize,
        CancellationToken ct = default);
    Task AddAsync(Document document, CancellationToken ct = default);
}
