using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>
/// One status change of a payout, never edited afterwards: who caused it (null for the system or PayOS), which
/// attempt, to which account, when, and the PayOS id or failure reason.
/// </summary>
public sealed class PayoutStatusHistory
{
    private PayoutStatusHistory() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid PayoutId { get; private set; }
    public string Status { get; private set; } = default!;
    public int AttemptNo { get; private set; }
    public string? AccountLast4 { get; private set; }
    public Guid? ActorUserId { get; private set; }
    public string? Note { get; private set; }
    public DateTimeOffset At { get; private set; }

    internal static PayoutStatusHistory Of(
        PayoutTransaction payout,
        Guid? actorUserId,
        DateTimeOffset now,
        string? eventName = null,
        string? note = null
    ) =>
        new()
        {
            PayoutId = payout.Id,
            Status = eventName ?? payout.Status,
            AttemptNo = payout.AttemptCount,
            AccountLast4 = payout.SnapAccountLast4,
            ActorUserId = actorUserId,
            Note =
                note
                ?? (payout.Status == PayoutStatus.Failed ? payout.LastError : payout.ProviderRef),
            At = now,
        };
}
