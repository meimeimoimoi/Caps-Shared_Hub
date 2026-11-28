namespace Caps.Contracts;

/// <summary>
/// Something the expert must know about money owed to them: recorded at settlement, transferred, failed, or
/// failed on every allowed attempt so another verified bank account is needed. Published through the billing
/// outbox; the notification service tells the expert in-app and, when an email is known, by email.
/// </summary>
/// <param name="Id">Event id, also used to ignore a redelivered message.</param>
/// <param name="Email">The expert's contact email from the review case; null tells them in-app only.</param>
/// <param name="Change">RECORDED, SUCCEEDED, FAILED or ACCOUNT_NEEDED.</param>
public sealed record ExpertPayoutNoticeEvent(
    Guid Id,
    Guid ExpertUserId,
    string? Email,
    Guid PayoutId,
    long Amount,
    string Change,
    DateTimeOffset TransferableFrom,
    DateTimeOffset OccurredAt
);

/// <summary>
/// The daily payout summary for the operations inbox (agreed with the advisor 2026-11-28): unsent payouts past
/// their deadline, near it, ready to send, and those that waited 30 days or more for a verified bank account.
/// </summary>
public sealed record PayoutDigestEvent(
    Guid Id,
    int Overdue,
    long OverdueAmount,
    int DueSoon,
    int Ready,
    int WaitingForAccount,
    DateTimeOffset OccurredAt
);
