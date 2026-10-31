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
/// A review case moved on: keeps an in-app notification for each party who should hear about it, emails the
/// client when money moves or they must act, and alerts the operations inbox about a new dispute. Contact
/// details never cross between the parties.
/// </summary>
public sealed class ReviewCaseStatusChangedConsumer(
    NotificationDbContext db,
    IEmailSender sender,
    IOptions<AppLinkOptions> links,
    IConfiguration config,
    TimeProvider clock,
    NotificationPush push
) : IConsumer<ReviewCaseStatusChangedEvent>
{
    public const string Type = "REVIEW_CASE_STATUS_CHANGED";

    private static (bool Client, bool EmailClient, bool Expert) Audience(string? from, string to) =>
        to switch
        {
            "IN_REVIEW" when from == "AWAITING_USER_INFORMATION" => (false, false, true),
            "IN_REVIEW" => (true, false, false),
            "EXPERT_DECLINED" or "EXPERT_TIMEOUT" or "AWAITING_ACCEPTANCE" => (true, true, false),
            "COMPLETED" or "DISPUTED" => (false, false, true),
            "AUTO_CONFIRMED" => (true, false, true),
            "DELIVERY_OVERDUE" or "RESOLVED" or "TERMINATED" => (true, true, true),
            _ => (false, false, false),
        };

    public async Task Consume(ConsumeContext<ReviewCaseStatusChangedEvent> context)
    {
        var m = context.Message;
        var ct = context.CancellationToken;
        var (client, emailClient, expert) = Audience(m.FromStatus, m.ToStatus);
        if (expert)
        {
            await NotifyAsync(m, m.ExpertUserId, $"/expert/cases/{m.ReviewCaseId}", ct);
        }
        if (client)
        {
            var path = $"/cases/{m.ReviewCaseId}";
            var notification = await NotifyAsync(m, m.RequesterUserId, path, ct);
            // Cases booked before the email was kept have none: in-app only
            if (emailClient && m.RequesterEmail is not null && notification.EmailSentAt == null)
            {
                var content = ExpertDecisionEmailTemplate.Build(
                    m,
                    m.RequesterEmail,
                    links.Value.Link(path)
                );
                await SendAsync(m.RequesterEmail, content, ct);
                notification.MarkEmailSent(clock.GetUtcNow());
                await db.SaveChangesAsync(ct);
            }
        }
        if (
            m.ToStatus == "DISPUTED"
            && config["Notifications:DisputeEmail"] is { Length: > 0 } inbox
        )
        {
            // no sent marker for this copy, so a redelivered event mails the inbox twice
            var content = ExpertDecisionEmailTemplate.BuildDisputeAlert(
                m,
                inbox,
                links.Value.Link($"/admin/disputes/{m.ReviewCaseId}")
            );
            await SendAsync(inbox, content, ct);
        }
    }

    // One row per recipient. The row id is derived from the event and the user, so a redelivery finds it
    private async Task<UserNotification> NotifyAsync(
        ReviewCaseStatusChangedEvent m,
        Guid userId,
        string path,
        CancellationToken ct
    )
    {
        var sourceId = SourceId(m.Id, userId);
        var stored = await db.Notifications.FirstOrDefaultAsync(
            x => x.SourceEventId == sourceId,
            ct
        );
        if (stored != null)
        {
            return stored;
        }
        var data = JsonSerializer.Serialize(
            new
            {
                reviewCaseId = m.ReviewCaseId,
                fromStatus = m.FromStatus,
                toStatus = m.ToStatus,
                note = m.Note,
                link = path,
            }
        );
        var notification = UserNotification.Create(userId, sourceId, Type, data, m.OccurredAt);
        db.Notifications.Add(notification);
        await db.SaveChangesAsync(ct);
        await push.CreatedAsync(notification, ct);
        return notification;
    }

    private static Guid SourceId(Guid eventId, Guid userId)
    {
        var bytes = eventId.ToByteArray();
        var user = userId.ToByteArray();
        for (var i = 0; i < bytes.Length; i++)
        {
            bytes[i] ^= user[i];
        }
        return new Guid(bytes);
    }

    private Task SendAsync(
        string to,
        ExpertDecisionEmailTemplate.Content content,
        CancellationToken ct
    ) =>
        sender.SendAsync(
            new EmailMessage(to, content.Subject, content.Text, content.Html, [EmailAssets.Logo]),
            ct
        );
}
