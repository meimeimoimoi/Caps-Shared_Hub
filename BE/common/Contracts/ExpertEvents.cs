namespace Caps.Contracts;

// Contracts between services: only add optional fields; never remove or rename a released field.

/// <summary>
/// A Gate 1 (eligibility) decision on an expert application. Published by the expert service through its
/// outbox; the notification service emails the applicant and keeps an in-app notification.
/// </summary>
/// <param name="Id">Event id, also used to ignore a redelivered message.</param>
/// <param name="UserId">Applicant account id (identity service).</param>
/// <param name="Outcome">ELIGIBLE, NEED_MORE_INFORMATION or NOT_ELIGIBLE.</param>
/// <param name="EarliestReapplyAt">When a new application is allowed (NOT_ELIGIBLE only).</param>
/// <param name="Issues">Requirements to supplement or not met, with the reviewer's note.</param>
public sealed record ExpertEligibilityDecidedEvent(
    Guid Id,
    Guid UserId,
    string Email,
    string DisplayName,
    Guid ApplicationId,
    string Outcome,
    DateTimeOffset DecidedAt,
    DateTimeOffset? EarliestReapplyAt,
    IReadOnlyList<EligibilityIssue> Issues
);

/// <summary>One requirement in a Gate 1 decision that was not passed.</summary>
/// <param name="Code">EV-01…EV-06.</param>
/// <param name="Result">FAIL or NEED_MORE_INFORMATION.</param>
public sealed record EligibilityIssue(string Code, string Result, string? Note);
