using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;
public sealed class AiQuotaRepository(DbContext dbContext) : IAiQuotaRepository
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
