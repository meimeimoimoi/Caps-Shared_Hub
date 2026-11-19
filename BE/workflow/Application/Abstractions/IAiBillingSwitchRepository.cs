using Caps.Workflow.Domain.Workspace;

namespace Caps.Workflow.Application.Abstractions;

/// <summary>The stored paid-AI switch (one row, or none before an admin first sets it).</summary>
public interface IAiBillingSwitchRepository
{
    Task<AiBillingSwitch?> FindAsync(CancellationToken ct);

    void Add(AiBillingSwitch aiBillingSwitch);
}
