using System.Text.Json;
using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Infrastructure.Persistence;

namespace Caps.Expert.Infrastructure.Messaging;

/// <summary>Adds the message to the outbox table; saved by the caller's unit of work.</summary>
public sealed class ExpertNotificationOutbox(ExpertDbContext db) : IExpertNotificationOutbox
{
    public void Enqueue(ExpertEligibilityDecidedEvent message, DateTimeOffset now) =>
        db.NotificationOutbox.Add(
            new NotificationOutboxEntry
            {
                Id = message.Id,
                MessageType = nameof(ExpertEligibilityDecidedEvent),
                Payload = JsonSerializer.Serialize(message),
                CreatedAt = now,
            }
        );
}
