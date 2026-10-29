namespace Caps.Contracts;

/// <summary>
/// A client paid for a review case, so it now waits for the expert to accept or decline. Published by the
/// workflow service after committing; the notification service keeps an in-app notification for the expert.
/// </summary>
/// <param name="Id">Event id, also used to ignore a redelivered message.</param>
/// <param name="ExpertUserId">The expert's account id (identity service).</param>
/// <param name="Fee">Price frozen on the case, in VND.</param>
/// <param name="ResponseDeadline">The expert must accept or decline by then, or the client is refunded.</param>
public sealed record ReviewCaseRequestedEvent(
    Guid Id,
    Guid ReviewCaseId,
    Guid ExpertUserId,
    long Fee,
    int TurnaroundHours,
    DateTimeOffset ResponseDeadline,
    DateTimeOffset OccurredAt
);

/// <summary>
/// The expert asked the client for more information; the case ends if the client does not answer by DueAt.
/// Published by the workflow service after committing; the notification service tells and emails the client.
/// </summary>
/// <param name="RequesterEmail">Copied from the client's token at booking; null for older cases (no email).</param>
public sealed record ReviewCaseInfoRequestedEvent(
    Guid Id,
    Guid ReviewCaseId,
    Guid RequesterUserId,
    string? RequesterEmail,
    string Message,
    DateTimeOffset DueAt,
    DateTimeOffset OccurredAt
);
