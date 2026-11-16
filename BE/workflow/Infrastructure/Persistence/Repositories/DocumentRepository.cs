using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for user document workspaces.</summary>
public sealed class DocumentRepository(WorkflowDbContext dbContext) : IDocumentRepository
{
    private readonly DbSet<Document> _documents = dbContext.Set<Document>();

    public async Task<Document?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _documents.FirstOrDefaultAsync(d => d.Id == id, ct);
    }

    public async Task<(IReadOnlyList<Document> Items, int TotalCount)> GetPageByUserIdAsync(
        Guid userId,
        string? status,
        int page,
        int pageSize,
        CancellationToken ct = default
    )
    {
        var query = _documents.AsNoTracking().Where(d => d.OwnerUserId == userId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToUpperInvariant();
            query = query.Where(d => d.Status == normalizedStatus);
        }

        var totalCount = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(d => d.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<string?> GetTemplateFieldSchemaAsync(
        Guid templateVersionId,
        CancellationToken ct = default
    )
    {
        return await dbContext
            .TemplateVersions.AsNoTracking()
            .Where(tv => tv.Id == templateVersionId)
            .Select(tv => tv.FieldSchema)
            .FirstOrDefaultAsync(ct);
    }

    public async Task AddAsync(Document document, CancellationToken ct = default)
    {
        await _documents.AddAsync(document, ct);
    }

    public Task<bool> OwnsVersionAsync(
        Guid userId,
        Guid documentId,
        Guid versionId,
        CancellationToken ct
    ) =>
        dbContext.DocumentVersions.AnyAsync(
            v =>
                v.Id == versionId
                && v.DocumentId == documentId
                && _documents.Any(d => d.Id == documentId && d.OwnerUserId == userId),
            ct
        );
}
