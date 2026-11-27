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
/// An announced or withdrawn platform fee change: keeps an in-app notification, then emails the expert. A
/// redelivered message reuses the stored row and only sends a missing email.
/// </summary>
public sealed class PlatformFeeChangeAnnouncedConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock,
    NotificationPush push
) : IConsumer<PlatformFeeChangeAnnouncedEvent>
{
    public const string AnnouncedType = "PLATFORM_FEE_CHANGE_ANNOUNCED";
    public const string CancelledType = "PLATFORM_FEE_CHANGE_CANCELLED";

    public async Task Consume(ConsumeContext<PlatformFeeChangeAnnouncedEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        var link = $"/expert/services/{m.ServiceCode}/pricing";
        var notification = await db.Notifications.FirstOrDefaultAsync(
            x => x.SourceEventId == m.Id,
            ct
        );
        if (notification == null)
        {
            var data = JsonSerializer.Serialize(
                new
                {
                    serviceCode = m.ServiceCode,
                    serviceName = m.ServiceName,
                    currentPercent = m.CurrentPercent,
                    newPercent = m.NewPercent,
                    netNow = m.NetNow,
                    netNew = m.NetNew,
                    effectiveFrom = m.EffectiveFrom,
                    link,
                }
            );
            var type = m.Cancelled ? CancelledType : AnnouncedType;
            notification = UserNotification.Create(m.UserId, m.Id, type, data, m.OccurredAt);
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
