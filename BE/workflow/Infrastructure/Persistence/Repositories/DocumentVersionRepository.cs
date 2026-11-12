using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for document versions.</summary>
public sealed class DocumentVersionRepository(WorkflowDbContext dbContext) : IDocumentVersionRepository
{
    private readonly DbSet<DocumentVersion> _versions = dbContext.Set<DocumentVersion>();

    public async Task<DocumentVersion?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _versions.AsNoTracking().FirstOrDefaultAsync(v => v.Id == id, ct);
    }

    public async Task<IReadOnlyList<DocumentVersion>> GetByDocumentIdAsync(Guid documentId, CancellationToken ct = default)
    {
        return await _versions
            .AsNoTracking()
            .Where(v => v.DocumentId == documentId)
            .OrderByDescending(v => v.VersionNo)
            .ToListAsync(ct);
    }

    public async Task<int> GetNextVersionNoAsync(Guid documentId, CancellationToken ct = default)
    {
        var maxVersion = await _versions
            .Where(v => v.DocumentId == documentId)
            .MaxAsync(v => (int?)v.VersionNo, ct);

        return (maxVersion ?? 0) + 1;
    }

    public async Task AddAsync(DocumentVersion version, CancellationToken ct = default)
    {
        await _versions.AddAsync(version, ct);
    }
}

