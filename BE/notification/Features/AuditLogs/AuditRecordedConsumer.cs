using Caps.Contracts;
using Caps.Notification.Data;
using Caps.Notification.Entities;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Features.AuditLogs;

/// <summary>Stores a staff action reported by another service. A redelivered event finds its row and stops.</summary>
public sealed class AuditRecordedConsumer(NotificationDbContext db) : IConsumer<AuditRecordedEvent>
{
    public async Task Consume(ConsumeContext<AuditRecordedEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        if (await db.AuditLogs.AnyAsync(x => x.Id == m.Id, ct))
            return;
        db.AuditLogs.Add(
            AuditLog.Record(
                m.Id,
                m.Service,
                m.EntityType,
                m.EntityId,
                m.Action,
                m.ActorUserId,
                m.Detail,
                m.OccurredAt
            )
        );
        await db.SaveChangesAsync(ct);
    }
}
