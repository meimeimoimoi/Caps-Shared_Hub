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

/// <summary>
/// A review case moved to another status. Published by the workflow service after committing; the notification
/// service decides who hears about it. Booking (ReviewCaseRequestedEvent) and questions
/// (ReviewCaseInfoRequestedEvent) keep their own events. No contact details of one party ever reach the other.
/// </summary>
/// <param name="Note">The step's note when it has one: decline reason, dispute reason or the admin's decision.</param>
/// <param name="RequesterEmail">Only to email the client themselves; null for older cases.</param>
public sealed record ReviewCaseStatusChangedEvent(
    Guid Id,
    Guid ReviewCaseId,
    string? FromStatus,
    string ToStatus,
    string? Note,
    Guid RequesterUserId,
    string? RequesterEmail,
    Guid ExpertUserId,
    DateTimeOffset OccurredAt
);

/// <summary>
/// A paid request still waits for the expert a few hours before the response deadline. Published once per case
/// by the workflow service; the notification service reminds the expert in the app.
/// </summary>
public sealed record ReviewCaseResponseDueEvent(
    Guid Id,
    Guid ReviewCaseId,
    Guid ExpertUserId,
    DateTimeOffset ResponseDeadline,
    DateTimeOffset OccurredAt
);
