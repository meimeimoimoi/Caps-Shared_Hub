using System.Text.Json;
using Caps.Contracts;
using Caps.Notification.Data;
using Caps.Notification.Email;
using Caps.Notification.Entities;
using Caps.Notification.Features.ExpertDecisions;
using Caps.Notification.Features.Realtime;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Caps.Notification.Features.ReviewCases;

/// <summary>
/// A dispute is past its decision deadline: emails the operations inbox (Notifications:DisputeEmail) every
/// time, so the case is decided, and on the first alert of a deadline tells the client and the expert in-app
/// that the decision is late while the fee stays held. No inbox configured, no email.
/// </summary>
// ponytail: no sent marker for the inbox email, so a redelivered event mails it twice; store one if that becomes noise
public sealed class ReviewCaseDisputeOverdueConsumer(
    NotificationDbContext db,
    NotificationPush push,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    IConfiguration config
) : IConsumer<ReviewCaseDisputeOverdueEvent>
{
    public const string Type = "REVIEW_CASE_DISPUTE_OVERDUE";

    public async Task Consume(ConsumeContext<ReviewCaseDisputeOverdueEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        if (m.First)
        {
            await NotifyAsync(m, m.RequesterUserId, $"/cases/{m.ReviewCaseId}", ct);
            await NotifyAsync(m, m.ExpertUserId, $"/expert/cases/{m.ReviewCaseId}", ct);
        }
        if (config["Notifications:DisputeEmail"] is not { Length: > 0 } inbox)
        {
            return;
        }
        var content = ExpertDecisionEmailTemplate.BuildDisputeOverdueAlert(
            m,
            inbox,
            links.Value.Link($"/admin/disputes/{m.ReviewCaseId}")
        );
        await sender.SendAsync(
            new EmailMessage(
                inbox,
                content.Subject,
                content.Text,
                content.Html,
                [EmailAssets.Logo]
            ),
            ct
        );
    }

    // One row per party; the row id comes from the event and the user, so a redelivery finds it
    private async Task NotifyAsync(
        ReviewCaseDisputeOverdueEvent m,
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
