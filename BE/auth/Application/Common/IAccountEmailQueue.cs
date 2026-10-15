using Caps.Auth.Domain.Users;

namespace Caps.Auth.Application.Common;

/// <summary>Sends account emails (verification, password reset) through the outbox, with a cooldown.</summary>
public interface IAccountEmailQueue
{
    /// <summary>
    /// Replaces any unused token of the purpose and queues the email (verification or password reset).
    /// Throws EMAIL_COOLDOWN when one was requested too recently.
    /// </summary>
    Task QueueAsync(User user, string purpose, CancellationToken ct);
}
