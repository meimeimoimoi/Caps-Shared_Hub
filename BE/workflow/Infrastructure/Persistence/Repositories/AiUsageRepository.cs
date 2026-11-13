using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;
public sealed class AiUsageRepository(DbContext dbContext) : IAiUsageRepository
{
    private readonly DbSet<AiUsage> _aiUsages = dbContext.Set<AiUsage>();
    public async Task AddAsync(AiUsage usage, CancellationToken ct = default)
    {
        await _aiUsages.AddAsync(usage, ct);
    }
}
