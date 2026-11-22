using System.Text.Json;
using Caps.Contracts;
using Caps.Notification.Data;
using Caps.Notification.Entities;
using Caps.Notification.Features.Realtime;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Notification.Features.ReviewCases;

/// <summary>
/// An open dispute is close to the end of the expert's statement window: reminds the expert in the app and pushes
/// it if they are online. A redelivered message finds the stored row and does nothing.
/// </summary>
public sealed class ReviewCaseStatementDueConsumer(NotificationDbContext db, NotificationPush push)
    : IConsumer<ReviewCaseStatementDueEvent>
{
    public const string Type = "REVIEW_CASE_STATEMENT_DUE";

    public async Task Consume(ConsumeContext<ReviewCaseStatementDueEvent> context)
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
                statementDueBy = m.StatementDueBy,
                link = $"/expert/cases/{m.ReviewCaseId}",
            }
        );
        var notification = UserNotification.Create(m.ExpertUserId, m.Id, Type, data, m.OccurredAt);
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(ct);
        await push.CreatedAsync(notification, ct);
    }
}
