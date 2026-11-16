using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for user AI chat quota balances.</summary>
public sealed class AiQuotaRepository(WorkflowDbContext dbContext) : IAiQuotaRepository
{
    private readonly DbSet<AiQuota> _quotas = dbContext.Set<AiQuota>();

    public async Task AddAsync(AiQuota aiQuota, CancellationToken ct = default)
    {
        await _quotas.AddAsync(aiQuota, ct);
    }

    public async Task<AiQuota?> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _quotas.FirstOrDefaultAsync(q => q.UserId == userId, ct);
    }
}
