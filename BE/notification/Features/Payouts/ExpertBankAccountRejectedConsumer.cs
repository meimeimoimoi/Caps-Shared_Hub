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

namespace Caps.Notification.Features.Payouts;

/// <summary>
/// Staff rejected the expert's bank account: keeps an in-app notification, then emails the expert when billing
/// knows the address. A redelivered message reuses the stored row and only sends a missing email.
/// </summary>
public sealed class ExpertBankAccountRejectedConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock,
    NotificationPush push
) : IConsumer<ExpertBankAccountRejectedEvent>
{
    public const string Type = "EXPERT_BANK_ACCOUNT_REJECTED";

    public async Task Consume(ConsumeContext<ExpertBankAccountRejectedEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        var link = ExpertPayoutNoticeConsumer.IncomePath;
        var notification = await db.Notifications.FirstOrDefaultAsync(
            x => x.SourceEventId == m.Id,
            ct
        );
        if (notification == null)
        {
            var data = JsonSerializer.Serialize(
                new
                {
                    bankName = m.BankName,
                    accountLast4 = m.AccountLast4,
                    reason = m.Reason,
                    link,
                }
            );
            notification = UserNotification.Create(m.ExpertUserId, m.Id, Type, data, m.OccurredAt);
            db.Notifications.Add(notification);
            await db.SaveChangesAsync(ct);
            await push.CreatedAsync(notification, ct);
        }
        if (notification.EmailSentAt != null || m.Email == null)
        {
            return;
        }

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
