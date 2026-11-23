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
/// The expert asked for more working days: keeps an in-app notification for the client, pushes it, then emails
/// them so they can answer before the delivery deadline (silence keeps the deadline). A redelivered message reuses
/// the stored row and only sends the email if it has not gone out yet.
/// </summary>
public sealed class ReviewCaseExtensionRequestedConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock,
    NotificationPush push
) : IConsumer<ReviewCaseExtensionRequestedEvent>
{
    public const string Type = "REVIEW_CASE_EXTENSION_REQUESTED";

    public async Task Consume(ConsumeContext<ReviewCaseExtensionRequestedEvent> context)
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
                    days = m.Days,
                    deliveryDeadline = m.DeliveryDeadline,
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
