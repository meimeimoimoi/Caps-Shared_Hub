using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence.Repositories;

/// <summary>EF Core store for the single paid-AI switch row.</summary>
public sealed class AiBillingSwitchRepository(WorkflowDbContext dbContext)
    : IAiBillingSwitchRepository
{
    public Task<AiBillingSwitch?> FindAsync(CancellationToken ct) =>
        dbContext
            .Set<AiBillingSwitch>()
            .FirstOrDefaultAsync(x => x.Id == AiBillingSwitch.SingletonId, ct);

    public void Add(AiBillingSwitch aiBillingSwitch) =>
        dbContext.Set<AiBillingSwitch>().Add(aiBillingSwitch);
}
