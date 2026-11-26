using System.Text.Json;
using Caps.Contracts;
using Caps.Notification.Data;
using Caps.Notification.Entities;
using Caps.Notification.Features.Realtime;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Features.ReviewCases;

/// <summary>
/// An admin extended a dispute's decision deadline: tells the client and the expert in-app with the new deadline,
/// so neither waits on the old one. A redelivered message finds the stored rows and does nothing.
/// </summary>
public sealed class ReviewCaseDisputeExtendedConsumer(
    NotificationDbContext db,
    NotificationPush push
) : IConsumer<ReviewCaseDisputeExtendedEvent>
{
    public const string Type = "REVIEW_CASE_DISPUTE_EXTENDED";

    public async Task Consume(ConsumeContext<ReviewCaseDisputeExtendedEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        await NotifyAsync(m, m.RequesterUserId, $"/cases/{m.ReviewCaseId}", ct);
        await NotifyAsync(m, m.ExpertUserId, $"/expert/cases/{m.ReviewCaseId}", ct);
    }

    // One row per party; the row id comes from the event and the user, so a redelivery finds it
    private async Task NotifyAsync(
        ReviewCaseDisputeExtendedEvent m,
        Guid userId,
        string path,
        CancellationToken ct
    )
    {
        var sourceId = ReviewCaseStatusChangedConsumer.SourceId(m.Id, userId);
        if (await db.Notifications.AnyAsync(x => x.SourceEventId == sourceId, ct))
        {
            return;
        }
        var data = JsonSerializer.Serialize(
            new
            {
                reviewCaseId = m.ReviewCaseId,
                decideBy = m.DecideBy,
                link = path,
            }
        );
        var notification = UserNotification.Create(userId, sourceId, Type, data, m.OccurredAt);
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(ct);
        await push.CreatedAsync(notification, ct);
    }
}
