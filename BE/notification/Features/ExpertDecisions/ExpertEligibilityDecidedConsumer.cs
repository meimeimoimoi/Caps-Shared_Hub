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
/// Gate 1 decision: keeps an in-app notification for the applicant, then emails them. A redelivered message
/// reuses the stored row and only sends the email if it has not gone out yet.
/// </summary>
public sealed class ExpertEligibilityDecidedConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    TimeProvider clock
) : IConsumer<ExpertEligibilityDecidedEvent>
{
    public const string Type = "EXPERT_ELIGIBILITY_DECIDED";
    public const string ApplicationPath = "/expert/application";

    public async Task Consume(ConsumeContext<ExpertEligibilityDecidedEvent> context)
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
                    applicationId = m.ApplicationId,
                    outcome = m.Outcome,
                    earliestReapplyAt = m.EarliestReapplyAt,
                    link = ApplicationPath,
                }
            );
            notification = UserNotification.Create(m.UserId, m.Id, Type, data, m.DecidedAt);
            db.Notifications.Add(notification);
            await db.SaveChangesAsync(ct);
        }
        if (notification.EmailSentAt != null)
            return;

        var content = ExpertDecisionEmailTemplate.Build(m, links.Value.Link(ApplicationPath));
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
