using System.Text.Json;
using Caps.Auth.Application.Abstractions.Messaging;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Common.Domain;
using Caps.Contracts;

namespace Caps.Auth.Infrastructure.Messaging;

/// <summary>Adds the audit event to the account event outbox; saved by the caller's unit of work.</summary>
public sealed class AuditTrailWriter(AuthDbContext db, TimeProvider clock) : IAuditTrail
{
    private static readonly JsonSerializerOptions DetailJson = new(JsonSerializerDefaults.Web);

    public void Record(
        string entityType,
        Guid entityId,
        string action,
        Guid? actorUserId,
        object? detail = null
    )
    {
        var now = clock.GetUtcNow();
        var message = new AuditRecordedEvent(
            UuidV7.NewGuid(),
            "auth",
            entityType,
            entityId,
            action,
            actorUserId,
            detail == null ? null : JsonSerializer.Serialize(detail, DetailJson),
            now
        );
        db.AccountEventOutbox.Add(
            new AccountEventOutbox
            {
                Id = message.Id,
                MessageType = nameof(AuditRecordedEvent),
                Payload = JsonSerializer.Serialize(message),
                CreatedAt = now,
            }
        );
    }
}
