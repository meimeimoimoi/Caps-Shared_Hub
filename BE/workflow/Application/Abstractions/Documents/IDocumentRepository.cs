using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions.Documents;

/// <summary>Repository port for user document workspaces.</summary>
public interface IDocumentRepository
{
    Task<Document?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<(IReadOnlyList<Document> Items, int TotalCount)> GetPageByUserIdAsync(
        Guid userId,
        string? status,
        int page,
        int pageSize,
        CancellationToken ct = default
    );
    Task<string?> GetTemplateFieldSchemaAsync(
        Guid templateVersionId,
        CancellationToken ct = default
    );
    Task AddAsync(Document document, CancellationToken ct = default);

    /// <summary>True when the version belongs to the document and the document belongs to the user.</summary>
    Task<bool> OwnsVersionAsync(Guid userId, Guid documentId, Guid versionId, CancellationToken ct);
}
