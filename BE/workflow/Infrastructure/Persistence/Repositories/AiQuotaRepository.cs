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

    public async Task<bool> TryReserveOneAsync(
        Guid userId,
        int initialBalance,
        DateTimeOffset now,
        CancellationToken ct = default
    )
    {
        var seed = Math.Max(0, initialBalance);
        // Seed on first AI chat turn without racing concurrent requests, then decrement atomically.
        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO workspace.ai_quota (user_id, balance, updated_at)
            VALUES ({userId}, {seed}, {now})
            ON CONFLICT (user_id) DO NOTHING
            """,
            ct
        );
        var updated = await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE workspace.ai_quota
            SET balance = balance - 1, updated_at = {now}
            WHERE user_id = {userId} AND balance > 0
            """,
            ct
        );
        return updated == 1;
    }

    public Task RefundOneAsync(Guid userId, DateTimeOffset now, CancellationToken ct = default) =>
        dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE workspace.ai_quota
            SET balance = balance + 1, updated_at = {now}
            WHERE user_id = {userId}
            """,
            ct
        );
}
