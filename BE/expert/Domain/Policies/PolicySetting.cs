namespace Caps.Expert.Domain.Policies;

/// <summary>
/// The current value of one adjustable policy parameter. A missing row means the configured default applies;
/// every change returns the history row to store with it.
/// </summary>
public sealed class PolicySetting
{
    public const int MaxReasonLength = 1000;

    private PolicySetting() { }

    public string Key { get; private set; } = default!;
    public int Value { get; private set; }

    /// <summary>Account id from the identity service (no foreign key across services).</summary>
    public Guid UpdatedByUserId { get; private set; }
    public DateTimeOffset UpdatedAt { get; private set; }

    /// <summary>First change of a value that so far used its configured default.</summary>
    /// <param name="defaultValue">The value in effect before this change, recorded as the old value.</param>
    public static (PolicySetting Setting, PolicySettingChange Change) Create(
        string key,
        int defaultValue,
        int value,
        Guid actorUserId,
        string? reason,
        DateTimeOffset now
    )
    {
        var setting = new PolicySetting { Key = key, Value = defaultValue };
        var change = setting.Change(value, actorUserId, reason, now);
        return (setting, change);
    }

    /// <summary>Sets a new value; the reason is required and the value must be within its range.</summary>
    public PolicySettingChange Change(
        int value,
        Guid actorUserId,
        string? reason,
        DateTimeOffset now
    )
    {
        PolicySettingKeys.Validate(Key, value);
        var cleaned = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        if (cleaned == null)
            throw ExpertErrors.PolicyReasonRequired();
        if (cleaned.Length > MaxReasonLength)
            throw ExpertErrors.PolicyReasonTooLong(MaxReasonLength);

        var change = PolicySettingChange.Record(Key, Value, value, actorUserId, cleaned, now);
        Value = value;
        UpdatedByUserId = actorUserId;
        UpdatedAt = now;
        return change;
    }
}
