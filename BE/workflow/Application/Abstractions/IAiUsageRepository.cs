using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>Repository for recording AI quota and credit usage.</summary>
public interface IAiUsageRepository
{
    Task AddAsync(AiUsage usage, CancellationToken ct = default);
}
