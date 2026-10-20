using System.Text.Json;
using Caps.Contracts;
using Caps.Expert.Application.Abstractions;
using Caps.Expert.Infrastructure.Persistence;

namespace Caps.Expert.Infrastructure.Messaging;

/// <summary>Adds the message to the outbox table; saved by the caller's unit of work.</summary>
public sealed class ExpertNotificationOutbox(ExpertDbContext db) : IExpertNotificationOutbox
{
    public void Enqueue(ExpertEligibilityDecidedEvent message, DateTimeOffset now) =>
        Add(
            message.Id,
            nameof(ExpertEligibilityDecidedEvent),
            JsonSerializer.Serialize(message),
            now
        );

    public void Enqueue(ExpertCompetencyDecidedEvent message, DateTimeOffset now) =>
        Add(
            message.Id,
            nameof(ExpertCompetencyDecidedEvent),
            JsonSerializer.Serialize(message),
            now
        );

    public void Enqueue(ExpertServiceAccessChangedEvent message, DateTimeOffset now) =>
        Add(
            message.Id,
            nameof(ExpertServiceAccessChangedEvent),
            JsonSerializer.Serialize(message),
            now
        );

    private void Add(Guid id, string type, string payload, DateTimeOffset now) =>
        db.NotificationOutbox.Add(
            new NotificationOutboxEntry
            {
                Id = id,
                MessageType = type,
                Payload = payload,
                CreatedAt = now,
            }
        );
}
