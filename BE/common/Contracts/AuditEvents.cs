namespace Caps.Contracts;

// Contracts between services: only add optional fields; never remove or rename a released field.

/// <summary>
/// One staff action worth keeping in the audit trail (lock an account, decide a review, change a policy...).
/// Each service writes it to its outbox in the same transaction as the action; the notification service stores
/// it in audit_log, which System Admins search.
/// </summary>
/// <param name="Id">Event id, also the audit_log id, so a redelivered message is stored once.</param>
/// <param name="Service">Service that performed the action, e.g. auth or expert.</param>
/// <param name="EntityType">Kind of record acted on, e.g. USER or EXPERT_QUALIFICATION.</param>
/// <param name="EntityId">Id of that record in its own service.</param>
/// <param name="Action">What happened, e.g. USER_LOCKED or FINAL_APPROVED.</param>
/// <param name="ActorUserId">Account that acted; null for the system.</param>
/// <param name="Detail">Small JSON object with the reason, note or values involved; null when there is none.</param>
/// <param name="OccurredAt">When the action was committed.</param>
public sealed record AuditRecordedEvent(
    Guid Id,
    string Service,
    string EntityType,
    Guid EntityId,
    string Action,
    Guid? ActorUserId,
    string? Detail,
    DateTimeOffset OccurredAt
);
