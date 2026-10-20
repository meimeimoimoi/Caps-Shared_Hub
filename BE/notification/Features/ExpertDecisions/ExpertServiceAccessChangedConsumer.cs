using System.Text.Json;
using Caps.Contracts;
using Caps.Notification.Data;
using Caps.Notification.Email;
using Caps.Notification.Entities;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Caps.Notification.Features.ExpertDecisions;

/// <summary>
/// Final approval, return for review, suspension or reinstatement of a service: keeps an in-app notification,
/// then emails the expert. A redelivered message reuses the stored row and only sends a missing email.
/// </summary>
public sealed class ExpertServiceAccessChangedConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock
) : IConsumer<ExpertServiceAccessChangedEvent>
{
    public const string Type = "EXPERT_SERVICE_ACCESS_CHANGED";

    public async Task Consume(ConsumeContext<ExpertServiceAccessChangedEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        var link = $"{ExpertCompetencyDecidedConsumer.QualificationsPath}/{m.QualificationId}";
        var notification = await db.Notifications.FirstOrDefaultAsync(
            x => x.SourceEventId == m.Id,
            ct
        );
        if (notification == null)
        {
            var data = JsonSerializer.Serialize(
                new
                {
                    qualificationId = m.QualificationId,
                    serviceCode = m.ServiceCode,
                    serviceName = m.ServiceName,
                    change = m.Change,
                    link,
                }
            );
            notification = UserNotification.Create(m.UserId, m.Id, Type, data, m.ChangedAt);
            db.Notifications.Add(notification);
            await db.SaveChangesAsync(ct);
        }
        if (notification.EmailSentAt != null)
            return;

        var content = ExpertDecisionEmailTemplate.Build(m, links.Value.Link(link));
        await sender.SendAsync(
            new EmailMessage(
                m.Email,
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
