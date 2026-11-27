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

/// <summary>
/// A Gate 2 (competency) decision on one Expert-Service qualification. Published by the expert service
/// through its outbox; the notification service emails the expert and keeps an in-app notification.
/// </summary>
/// <param name="Id">Event id, also used to ignore a redelivered message.</param>
/// <param name="UserId">Expert account id (identity service).</param>
/// <param name="ServiceName">Catalog name of the service, shown to the expert.</param>
/// <param name="Outcome">PENDING_FINAL_APPROVAL, NEED_MORE_INFORMATION or FAIL.</param>
/// <param name="EarliestReapplyAt">When the service can be registered again (FAIL only).</param>
/// <param name="Issues">Competencies to supplement or not met, with the reviewer's note.</param>
public sealed record ExpertCompetencyDecidedEvent(
    Guid Id,
    Guid UserId,
    string Email,
    string DisplayName,
    Guid QualificationId,
    string ServiceCode,
    string ServiceName,
    string Outcome,
    DateTimeOffset DecidedAt,
    DateTimeOffset? EarliestReapplyAt,
    IReadOnlyList<CompetencyIssue> Issues
);

/// <summary>One competency in a Gate 2 decision that was not passed.</summary>
/// <param name="Code">C1…C5.</param>
/// <param name="Result">FAIL or NEED_MORE_INFORMATION.</param>
public sealed record CompetencyIssue(string Code, string Result, string? Note);

/// <summary>
/// A System Admin changed whether an expert may offer a service: final approval, return for review,
/// suspension or reinstatement. Published through the expert outbox; the notification service tells the expert.
/// </summary>
/// <param name="Id">Event id, also used to ignore a redelivered message.</param>
/// <param name="Change">APPROVED, RETURNED_FOR_REVIEW, SUSPENDED or REINSTATED.</param>
/// <param name="Note">The admin's note, shown to the expert.</param>
public sealed record ExpertServiceAccessChangedEvent(
    Guid Id,
    Guid UserId,
    string Email,
    string DisplayName,
    Guid QualificationId,
    string ServiceCode,
    string ServiceName,
    string Change,
    string? Note,
    DateTimeOffset ChangedAt
);

/// <summary>
/// A System Admin announced a platform fee change for a service the expert has priced, or withdrew the pending
/// one. Published through the expert outbox; the notification service tells the expert in their own numbers.
/// </summary>
/// <param name="Id">Event id, also used to ignore a redelivered message.</param>
/// <param name="Fee">The expert's current price for the service, in VND.</param>
/// <param name="NetNow">What the expert keeps per case at the rate in force.</param>
/// <param name="NetNew">What the expert would keep per case at the announced rate.</param>
/// <param name="Cancelled">True when the pending change was withdrawn and the rate in force stays.</param>
public sealed record PlatformFeeChangeAnnouncedEvent(
    Guid Id,
    Guid UserId,
    string Email,
    string DisplayName,
    string ServiceCode,
    string ServiceName,
    long Fee,
    int CurrentPercent,
    long NetNow,
    int NewPercent,
    long NetNew,
    DateTimeOffset EffectiveFrom,
    string? Reason,
    bool Cancelled,
    DateTimeOffset OccurredAt
);

/// <summary>
/// A System Admin narrowed the allowed price range and the expert's price for a service fell outside it, so the
/// service is hidden from the marketplace until they reprice. Published through the expert outbox.
/// </summary>
/// <param name="Id">Event id, also used to ignore a redelivered message.</param>
/// <param name="Fee">The expert's current price for the service, in VND.</param>
/// <param name="Reason">The admin's reason for the change, shown to the expert.</param>
public sealed record ExpertPriceOutOfRangeEvent(
    Guid Id,
    Guid UserId,
    string Email,
    string DisplayName,
    string ServiceCode,
    string ServiceName,
    long Fee,
    long MinFee,
    long MaxFee,
    string Reason,
    DateTimeOffset OccurredAt
);

/// <summary>
/// An expert asked for a force-majeure excuse of a violation. Published by the expert service; the notification
/// service emails the operations inbox so a System Admin reviews the request and its evidence.
/// </summary>
/// <param name="Kind">LATE, WITHDREW or NO_DELIVERY.</param>
/// <param name="FileCount">Evidence files attached (they stay in the expert service).</param>
public sealed record ExpertExcuseRequestedEvent(
    Guid Id,
    Guid ReviewCaseId,
    Guid ExpertProfileId,
    string? ExpertName,
    string Kind,
    string Reason,
    int FileCount,
    DateTimeOffset OccurredAt
);
