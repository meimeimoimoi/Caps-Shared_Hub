using System.Text.Json;

namespace Caps.Notification.Features.AuditLogs;

/// <summary>One audit entry; <see cref="Detail"/> is the JSON object the service sent, or null.</summary>
public sealed record AuditLogResponse(
    Guid Id,
    string Service,
    string EntityType,
    Guid EntityId,
    string Action,
    Guid? ActorUserId,
    JsonElement? Detail,
    DateTimeOffset CreatedAt
);

/// <summary>One page of audit entries with the total number that match the filters.</summary>
public sealed record AuditLogPageResponse(
    AuditLogResponse[] Items,
    int Page,
    int PageSize,
    int Total
);
