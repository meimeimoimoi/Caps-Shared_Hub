using System.Text.Json;
using Caps.Contracts;
using Caps.Notification.Data;
using Caps.Notification.Entities;
using Caps.Notification.Features.Realtime;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Features.ReviewCases;

/// <summary>
/// The client accepted or declined the expert's extension request: tells the expert in the app (experts get no
/// email, 01 Flow 5 Step 8) and pushes it if they are online. A redelivered message finds the stored row and does
/// nothing.
/// </summary>
public sealed class ReviewCaseExtensionDecidedConsumer(
    NotificationDbContext db,
    NotificationPush push
) : IConsumer<ReviewCaseExtensionDecidedEvent>
{
    public const string Type = "REVIEW_CASE_EXTENSION_DECIDED";

    public async Task Consume(ConsumeContext<ReviewCaseExtensionDecidedEvent> context)
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
                accepted = m.Accepted,
                days = m.Days,
                deliveryDeadline = m.DeliveryDeadline,
                link = $"/expert/cases/{m.ReviewCaseId}",
            }
        );
        var notification = UserNotification.Create(m.ExpertUserId, m.Id, Type, data, m.OccurredAt);
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(ct);
        await push.CreatedAsync(notification, ct);
    }
}
