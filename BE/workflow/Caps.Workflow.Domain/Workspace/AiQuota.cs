namespace Caps.Workflow.Domain.Workspace;

/// <summary>Free AI questions left for a user before credits are used.</summary>
public sealed class AiQuota
{
    public Guid UserId { get; set; }
    public int Balance { get; set; } = 10;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
