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
/// A payout notice from billing: keeps an in-app notification, then emails the expert when billing knows the
/// address. A redelivered message reuses the stored row and only sends a missing email.
/// </summary>
public sealed class ExpertPayoutNoticeConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock,
    NotificationPush push
) : IConsumer<ExpertPayoutNoticeEvent>
{
    public const string Type = "EXPERT_PAYOUT_NOTICE";
    public const string IncomePath = "/expert/income";

    public async Task Consume(ConsumeContext<ExpertPayoutNoticeEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        var notification = await db.Notifications.FirstOrDefaultAsync(
            x => x.SourceEventId == m.Id,
            ct
        );
        if (notification == null)
        {
            var data = JsonSerializer.Serialize(
                new
                {
                    payoutId = m.PayoutId,
                    amount = m.Amount,
                    change = m.Change,
                    transferableFrom = m.TransferableFrom,
                    link = IncomePath,
                }
            );
            notification = UserNotification.Create(m.ExpertUserId, m.Id, Type, data, m.OccurredAt);
            db.Notifications.Add(notification);
            await db.SaveChangesAsync(ct);
            await push.CreatedAsync(notification, ct);
        }
        if (notification.EmailSentAt != null || m.Email == null)
            return;

        var content = ExpertDecisionEmailTemplate.Build(m, links.Value.Link(IncomePath));
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
