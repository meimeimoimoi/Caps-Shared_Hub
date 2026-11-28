namespace Caps.Contracts;

/// <summary>
/// Something the expert must know about money owed to them: recorded at settlement, transferred, failed, or
/// failed on every allowed attempt so another verified bank account is needed. Published through the billing
/// outbox; the notification service tells the expert in-app and, when an email is known, by email.
/// </summary>
/// <param name="Id">Event id, also used to ignore a redelivered message.</param>
/// <param name="Email">The expert's contact email from the review case; null tells them in-app only.</param>
/// <param name="Change">
/// RECORDED, SUCCEEDED, FAILED, ACCOUNT_NEEDED, ACCOUNT_MISSING, HELD (under review) or RELEASED.
/// </param>
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
    int HeldPastReview,
    long AmountToSend,
    long? Balance,
    DateTimeOffset OccurredAt
);

/// <summary>Staff rejected the expert's bank account: they must link another one before they can be paid.</summary>
/// <param name="Email">The expert's sign-in email when they linked the account; null tells them in-app only.</param>
/// <param name="Reason">The staff reason, shown to the expert.</param>
public sealed record ExpertBankAccountRejectedEvent(
    Guid Id,
    Guid ExpertUserId,
    string? Email,
    string BankName,
    string AccountLast4,
    string? Reason,
    DateTimeOffset OccurredAt
);
