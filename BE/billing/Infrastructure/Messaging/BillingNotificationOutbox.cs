using System.Text.Json;
using Caps.Billing.Application.Abstractions;
using Caps.Billing.Infrastructure.Persistence;
using Caps.Contracts;

namespace Caps.Billing.Infrastructure.Messaging;

/// <summary>Adds the message to the outbox table; saved by the caller's unit of work.</summary>
public sealed class BillingNotificationOutbox(BillingDbContext db) : IBillingNotificationOutbox
{
    public void Enqueue(ExpertPayoutNoticeEvent message, DateTimeOffset now) =>
        db.NotificationOutbox.Add(
            new NotificationOutboxEntry
            {
                Id = message.Id,
                MessageType = nameof(ExpertPayoutNoticeEvent),
                Payload = JsonSerializer.Serialize(message),
                CreatedAt = now,
            }
        );

    public void Enqueue(PayoutDigestEvent message, DateTimeOffset now) =>
        db.NotificationOutbox.Add(
            new NotificationOutboxEntry
            {
                Id = message.Id,
                MessageType = nameof(PayoutDigestEvent),
                Payload = JsonSerializer.Serialize(message),
                CreatedAt = now,
            }
        );
}
