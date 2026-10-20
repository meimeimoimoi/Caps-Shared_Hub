using System.Text.Json;
using Caps.Auth.Application.Abstractions.Messaging;
using Caps.Auth.Domain.Users;
using Caps.Auth.Infrastructure.Persistence;
using Caps.Common.Domain;
using Caps.Contracts;

namespace Caps.Auth.Infrastructure.Messaging;

/// <summary>Writes the event as plain JSON: it only holds the account id and status.</summary>
public sealed class AccountEventOutboxWriter(AuthDbContext db, TimeProvider clock)
    : IAccountEventOutbox
{
    public void StatusChanged(User user)
    {
        var now = clock.GetUtcNow();
        var message = new AccountStatusChangedEvent(UuidV7.NewGuid(), user.Id, user.Status, now);
        db.AccountEventOutbox.Add(
            new AccountEventOutbox
            {
                Id = message.Id,
                Payload = JsonSerializer.Serialize(message),
                CreatedAt = now,
            }
        );
    }
}
