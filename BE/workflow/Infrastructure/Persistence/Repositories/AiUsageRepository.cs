using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for AI chat usage records.</summary>
public sealed class AiUsageRepository(WorkflowDbContext dbContext) : IAiUsageRepository
{
    private readonly DbSet<AiUsage> _aiUsages = dbContext.Set<AiUsage>();

    public async Task AddAsync(AiUsage usage, CancellationToken ct = default)
    {
        await _aiUsages.AddAsync(usage, ct);
    }
}
