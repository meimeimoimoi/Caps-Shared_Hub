using Caps.Workflow.Application.Abstractions.Documents;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for immutable form input snapshots of a document.</summary>
public sealed class InputSnapshotRepository(WorkflowDbContext dbContext) : IInputSnapshotRepository
{
    private readonly DbSet<InputSnapshot> _snapshots = dbContext.Set<InputSnapshot>();

    public async Task<InputSnapshot?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _snapshots.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id, ct);
    }

    public async Task<InputSnapshot?> GetLatestByDocumentIdAsync(
        Guid documentId,
        CancellationToken ct = default
    )
    {
        return await _snapshots
            .AsNoTracking()
            .Where(s => s.DocumentId == documentId)
            .OrderByDescending(s => s.VersionNo)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<int> GetNextVersionNoAsync(Guid documentId, CancellationToken ct = default)
    {
        var maxVersion = await _snapshots
            .Where(s => s.DocumentId == documentId)
            .MaxAsync(s => (int?)s.VersionNo, ct);

        return (maxVersion ?? 0) + 1;
    }

    public async Task AddAsync(InputSnapshot inputSnapshot, CancellationToken ct = default)
    {
        await _snapshots.AddAsync(inputSnapshot, ct);
    }
}
