namespace Caps.Expert.Application.Abstractions;

/// <summary>
/// Records a staff action for the audit log. Stored in the caller's transaction and published afterwards, so a
/// rolled back action leaves no entry.
/// </summary>
public interface IAuditTrail
{
    /// <summary>Queues one audit entry for the action being saved.</summary>
    /// <param name="detail">Small object serialized as the entry's JSON detail; null for none.</param>
    void Record(
        string entityType,
        Guid entityId,
        string action,
        Guid? actorUserId,
        DateTimeOffset now,
        object? detail = null
    );
}
