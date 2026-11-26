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
/// A paid request is close to its response deadline: reminds the expert in the app and by email. A redelivered
/// message reuses the stored row and only sends the email once.
/// </summary>
public sealed class ReviewCaseResponseDueConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock,
    NotificationPush push
) : IConsumer<ReviewCaseResponseDueEvent>
{
    public const string Type = "REVIEW_CASE_RESPONSE_DUE";

    public async Task Consume(ConsumeContext<ReviewCaseResponseDueEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        var path = $"/expert/cases/{m.ReviewCaseId}";
        var notification = await db.Notifications.FirstOrDefaultAsync(
            x => x.SourceEventId == m.Id,
            ct
        );
        if (notification == null)
        {
            var data = JsonSerializer.Serialize(
                new
                {
                    reviewCaseId = m.ReviewCaseId,
                    responseDeadline = m.ResponseDeadline,
                    link = path,
                }
            );
            notification = UserNotification.Create(m.ExpertUserId, m.Id, Type, data, m.OccurredAt);
            db.Notifications.Add(notification);
            await db.SaveChangesAsync(ct);
            await push.CreatedAsync(notification, ct);
        }
        // Cases booked before the expert's email was kept have none: in-app only
        if (notification.EmailSentAt != null || m.ExpertEmail is null)
        {
            return;
        }

        var content = ExpertDecisionEmailTemplate.Build(m, m.ExpertEmail, links.Value.Link(path));
        await sender.SendAsync(
            new EmailMessage(
                m.ExpertEmail,
                content.Subject,
                content.Text,
                content.Html,
                [EmailAssets.Logo]
            ),
            ct
        );
        notification.MarkEmailSent(clock.GetUtcNow());
        await db.SaveChangesAsync(ct);
    }
}
