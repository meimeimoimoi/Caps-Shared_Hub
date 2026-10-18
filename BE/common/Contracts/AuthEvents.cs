namespace Caps.Contracts;

// Contracts between services: only add optional fields; never remove or rename a released field.

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

/// <summary>
/// An account's status changed (e.g. PENDING_VERIFICATION → ACTIVE). Published by auth through its outbox so
/// other services can keep their own copy, such as the expert Marketplace filter (BR-M01).
/// </summary>
/// <param name="Id">Event id, also used to ignore a redelivered message.</param>
/// <param name="Status">The new account status, same values as the token's account_status claim.</param>
public sealed record AccountStatusChangedEvent(
    Guid Id,
    Guid UserId,
    string Status,
    DateTimeOffset ChangedAt
);
