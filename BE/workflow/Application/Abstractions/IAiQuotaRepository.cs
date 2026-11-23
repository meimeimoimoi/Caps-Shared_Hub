using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Repository for managing user AI query quotas.</summary>
public interface IAiQuotaRepository
{
    Task<AiQuota?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task AddAsync(AiQuota aiQuota, CancellationToken ct = default);
    Task<bool> TryReserveOneAsync(
        Guid userId,
        int initialBalance,
        DateTimeOffset now,
        CancellationToken ct = default
    );
    Task RefundOneAsync(Guid userId, DateTimeOffset now, CancellationToken ct = default);
}
