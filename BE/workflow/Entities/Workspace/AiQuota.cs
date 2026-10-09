namespace workflow.Entities.Workspace;

public sealed class AiQuota
{
    public Guid UserId { get; set; }
    public int Balance { get; set; } = 10;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
