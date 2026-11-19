namespace Caps.Notification.Entities;

/// <summary>
/// One staff action reported by another service through <c>AuditRecordedEvent</c>. Rows are only added, never
/// changed. Entity and actor ids are plain columns: the records live in their own services.
/// </summary>
public sealed class AuditLog
{
    /// <summary>The event id, so a redelivered message finds the row and stops.</summary>
    public Guid Id { get; private set; }

    public string Service { get; private set; } = default!;
    public string EntityType { get; private set; } = default!;
    public Guid EntityId { get; private set; }
    public string Action { get; private set; } = default!;
    public Guid? ActorUserId { get; private set; }

    /// <summary>JSON object with the reason, note or values involved; null when there is none.</summary>
    public string? Detail { get; private set; }

    /// <summary>When the action happened in its service.</summary>
    public DateTimeOffset CreatedAt { get; private set; }

    private AuditLog() { }

    public static AuditLog Record(
        Guid id,
        string service,
        string entityType,
        Guid entityId,
        string action,
        Guid? actorUserId,
        string? detail,
        DateTimeOffset occurredAt
    ) =>
        new()
        {
            Id = id,
            Service = service,
            EntityType = entityType,
            EntityId = entityId,
            Action = action,
            ActorUserId = actorUserId,
            Detail = detail,
            CreatedAt = occurredAt,
        };
}
