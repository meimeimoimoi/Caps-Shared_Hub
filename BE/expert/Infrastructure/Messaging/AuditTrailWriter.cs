using System.Text.Json;
using Caps.Common.Domain;
using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Infrastructure.Persistence;

namespace Caps.Expert.Infrastructure.Messaging;

/// <summary>Adds the audit event to the outbox table; saved by the caller's unit of work.</summary>
public sealed class AuditTrailWriter(ExpertDbContext db) : IAuditTrail
{
    private static readonly JsonSerializerOptions DetailJson = new(JsonSerializerDefaults.Web);

    public void Record(
        string entityType,
        Guid entityId,
        string action,
        Guid? actorUserId,
        DateTimeOffset now,
        object? detail = null
    )
    {
        var message = new AuditRecordedEvent(
            UuidV7.NewGuid(),
            "expert",
            entityType,
            entityId,
            action,
            actorUserId,
            detail == null ? null : JsonSerializer.Serialize(detail, DetailJson),
            now
        );
        db.NotificationOutbox.Add(
            new NotificationOutboxEntry
            {
                Id = message.Id,
                MessageType = nameof(AuditRecordedEvent),
                Payload = JsonSerializer.Serialize(message),
                CreatedAt = now,
            }
        );
    }
}
