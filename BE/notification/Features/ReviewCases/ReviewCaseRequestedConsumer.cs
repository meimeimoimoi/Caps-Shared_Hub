using System.Text.Json;
using Caps.Contracts;
using Caps.Notification.Data;
using Caps.Notification.Entities;
using Caps.Notification.Features.Realtime;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Features.ReviewCases;

/// <summary>
/// A paid review case waits for the expert: keeps an in-app notification and pushes it if they are online.
/// A redelivered message finds the stored row and does nothing.
/// </summary>
// in-app only; email once the event carries the expert's email (optional contract field)
public sealed class ReviewCaseRequestedConsumer(NotificationDbContext db, NotificationPush push)
    : IConsumer<ReviewCaseRequestedEvent>
{
    public const string Type = "REVIEW_CASE_REQUESTED";

    public async Task Consume(ConsumeContext<ReviewCaseRequestedEvent> context)
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
                fee = m.Fee,
                turnaroundHours = m.TurnaroundHours,
                responseDeadline = m.ResponseDeadline,
                link = $"/expert/cases/{m.ReviewCaseId}",
            }
        );

        var notification = UserNotification.Create(m.ExpertUserId, m.Id, Type, data, m.OccurredAt);
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(ct);
        await push.CreatedAsync(notification, ct);
    }
}
