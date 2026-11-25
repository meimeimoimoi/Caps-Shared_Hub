using System.Text.Json;
using Caps.Contracts;
using Caps.Notification.Data;
using Caps.Notification.Entities;
using Caps.Notification.Features.Realtime;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Features.ExpertDecisions;

/// <summary>
/// A review case counted against the expert (late, withdrew, never delivered): tells the expert in the app, linking
/// to their violations where a force-majeure excuse can be asked. A redelivered message finds the stored row and
/// does nothing.
/// </summary>
public sealed class ExpertViolationRecordedConsumer(NotificationDbContext db, NotificationPush push)
    : IConsumer<ExpertViolationRecordedEvent>
{
    public const string Type = "EXPERT_VIOLATION_RECORDED";

    public async Task Consume(ConsumeContext<ExpertViolationRecordedEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        if (await db.Notifications.AnyAsync(x => x.SourceEventId == m.Id, ct))
        {
            return;
        }
        var data = JsonSerializer.Serialize(
            new
            {
                reviewCaseId = m.ReviewCaseId,
                kind = m.Kind,
                link = "/expert/availability",
            }
        );
        var notification = UserNotification.Create(m.ExpertUserId, m.Id, Type, data, m.OccurredAt);
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(ct);
        await push.CreatedAsync(notification, ct);
    }
}
