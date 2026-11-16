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
/// A delivered result is about to confirm itself: reminds the client in the app and by email so they accept or
/// report a problem in time. A redelivered message reuses the stored row and only sends the email once.
/// </summary>
public sealed class ReviewCaseAcceptanceDueConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock,
    NotificationPush push
) : IConsumer<ReviewCaseAcceptanceDueEvent>
{
    public const string Type = "REVIEW_CASE_ACCEPTANCE_DUE";

    public async Task Consume(ConsumeContext<ReviewCaseAcceptanceDueEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        var path = $"/cases/{m.ReviewCaseId}";
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
                    acceptanceDeadline = m.AcceptanceDeadline,
                    link = path,
                }
            );
            notification = UserNotification.Create(
                m.RequesterUserId,
                m.Id,
                Type,
                data,
                m.OccurredAt
            );
            db.Notifications.Add(notification);
            await db.SaveChangesAsync(ct);
            await push.CreatedAsync(notification, ct);
        }
        // Cases booked before the email was kept have none: in-app only
        if (notification.EmailSentAt != null || m.RequesterEmail is null)
        {
            return;
        }

        var content = ExpertDecisionEmailTemplate.Build(
            m,
            m.RequesterEmail,
            links.Value.Link(path)
        );
        await sender.SendAsync(
            new EmailMessage(
                m.RequesterEmail,
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
