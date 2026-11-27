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
/// A narrower price range hid the expert's service: keeps an in-app notification, then emails the expert. A
/// redelivered message reuses the stored row and only sends a missing email.
/// </summary>
public sealed class ExpertPriceOutOfRangeConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock,
    NotificationPush push
) : IConsumer<ExpertPriceOutOfRangeEvent>
{
    public const string Type = "EXPERT_PRICE_OUT_OF_RANGE";

    public async Task Consume(ConsumeContext<ExpertPriceOutOfRangeEvent> context)
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
                    fee = m.Fee,
                    minFee = m.MinFee,
                    maxFee = m.MaxFee,
                    link,
                }
            );
            notification = UserNotification.Create(m.UserId, m.Id, Type, data, m.OccurredAt);
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
