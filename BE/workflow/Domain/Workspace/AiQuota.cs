namespace Caps.Workflow.Domain.Workspace;

/// <summary>Free AI questions left for a user before credits are used.</summary>
public sealed class AiQuota
{
    public Guid UserId { get; set; }
    public int Balance { get; set; } = 10;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    private AiQuota() { }

    public static AiQuota Create(Guid userId, int initialBalance, DateTimeOffset now)
    {
        return new AiQuota
        {
            UserId = userId,
            Balance = Math.Max(0, initialBalance),
            UpdatedAt = now,
        };
    }

    public bool HashAvailableQuota() => Balance > 0;

    public void Deduct(int amount, DateTimeOffset now)
    {
        if (amount <= 0)
            return;
        Balance = Math.Max(0, Balance - amount);
        UpdatedAt = now;
    }

    public void Refund(int amount, DateTimeOffset now)
    {
        if (amount <= 0)
            return;
        Balance += amount;
        UpdatedAt = now;
    }
}
