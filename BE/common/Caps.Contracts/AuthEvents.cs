namespace Caps.Contracts;

// Contracts between services: only add optional fields; never remove or rename a released field.

public sealed record UserRegisteredEvent(string UserId, string Email, DateTimeOffset At);

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
