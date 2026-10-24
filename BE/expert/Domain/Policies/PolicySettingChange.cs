using Caps.Common.Domain;

namespace Caps.Expert.Domain.Policies;

/// <summary>History of policy changes: old and new value, who changed it, why and when. Never changed afterwards.</summary>
public sealed class PolicySettingChange
{
    private PolicySettingChange() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public string Key { get; private set; } = default!;
    public int OldValue { get; private set; }
    public int NewValue { get; private set; }
    public string Reason { get; private set; } = default!;

    /// <summary>Account id from the identity service (no foreign key across services).</summary>
    public Guid ChangedByUserId { get; private set; }
    public DateTimeOffset ChangedAt { get; private set; }

    public static PolicySettingChange Record(
        string key,
        int oldValue,
        int newValue,
        Guid actorUserId,
        string reason,
        DateTimeOffset now
    ) =>
        new()
        {
            Key = key,
            OldValue = oldValue,
            NewValue = newValue,
            Reason = reason,
            ChangedByUserId = actorUserId,
            ChangedAt = now,
        };
}
