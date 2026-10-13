namespace Caps.Contracts;

// Contracts between services: only add optional fields; never remove or rename a released field.

/// <summary>Announces a new account to other services. Not published or consumed yet.</summary>
public sealed record UserRegisteredEvent(string UserId, string Email, DateTimeOffset At);

/// <summary>
/// Asks the notification service to send a verification or password reset email. Published through auth's
/// outbox; expired messages are dropped instead of sent.
/// </summary>
/// <param name="Code">6-digit code entered on the website (verification emails only); null for older messages.</param>
/// <param name="CodeExpiresAt">Code expiry, shorter than the link expiry.</param>
public sealed record AuthEmailRequestedEvent(
    Guid Id,
    string Email,
    string Purpose,
    string Link,
    DateTimeOffset ExpiresAt,
    string? Code = null,
    DateTimeOffset? CodeExpiresAt = null
);
