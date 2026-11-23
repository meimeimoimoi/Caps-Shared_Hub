using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Abstractions.Messaging;

/// <summary>Stores account status changes in the same transaction; a background publisher sends them later.</summary>
public interface IAccountEventOutbox
{
    /// <summary>Queues the user's current status as an AccountStatusChangedEvent.</summary>
    void StatusChanged(User user);
}
