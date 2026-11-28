namespace Caps.Workflow.Domain.Workspace;

/// <summary>
/// The platform-wide switch for paid AI. On: AI chat and draft generation use the free quota, then wallet
/// credits. Off: they are free. A single row; until an admin sets it, the AiBilling:Enabled setting applies.
/// </summary>
public sealed class AiBillingSwitch
{
    public const int SingletonId = 1;

    private AiBillingSwitch() { }

    public int Id { get; } = SingletonId;
    public bool Enabled { get; private set; }

    /// <summary>The admin who last flipped it.</summary>
    public Guid UpdatedBy { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    public static AiBillingSwitch Create(bool enabled, Guid adminUserId, DateTimeOffset now) =>
        new()
        {
            Enabled = enabled,
            UpdatedBy = adminUserId,
            UpdatedAt = now,
        };

    public void Set(bool enabled, Guid adminUserId, DateTimeOffset now)
    {
        Enabled = enabled;
        UpdatedBy = adminUserId;
        UpdatedAt = now;
    }
}
