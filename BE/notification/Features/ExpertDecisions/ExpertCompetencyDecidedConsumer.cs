using System.Text.Json;
using Caps.Contracts;
using Caps.Notification.Data;
using Caps.Notification.Email;
using Caps.Notification.Entities;
using Caps.Notification.Features.Realtime;
using MassTransit;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Caps.Notification.Features.ExpertDecisions;

/// <summary>
/// Gate 2 decision: keeps an in-app notification for the expert, then emails them. A redelivered message
/// reuses the stored row and only sends the email if it has not gone out yet.
/// </summary>
public sealed class ExpertCompetencyDecidedConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock,
    NotificationPush push
) : IConsumer<ExpertCompetencyDecidedEvent>
{
    public const string Type = "EXPERT_COMPETENCY_DECIDED";
    public const string QualificationsPath = "/expert/qualifications";

    public async Task Consume(ConsumeContext<ExpertCompetencyDecidedEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        var link = $"{QualificationsPath}/{m.QualificationId}";
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
                    outcome = m.Outcome,
                    earliestReapplyAt = m.EarliestReapplyAt,
                    link,
                }
            );
            notification = UserNotification.Create(m.UserId, m.Id, Type, data, m.DecidedAt);
            db.Notifications.Add(notification);
            await db.SaveChangesAsync(ct);
            await push.CreatedAsync(notification, ct);
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
