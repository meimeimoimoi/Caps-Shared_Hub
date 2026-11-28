using Caps.Billing.Domain;
using Caps.Common.Domain;

namespace Caps.Billing.Application.Common;

/// <summary>Unsent payouts counted by deadline stage (advisor 2026-11-28), and the money they need.</summary>
public sealed record PayoutSummary(
    int Overdue,
    long OverdueAmount,
    int DueSoon,
    int Ready,
    int WaitingForAccount,
    long AmountToSend
)
{
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public static PayoutSummary Of(
        IEnumerable<PayoutTransaction> unsent,
        DateTimeOffset now,
        WorkCalendar calendar
    )
    {
        int overdue = 0,
            dueSoon = 0,
            ready = 0,
            waiting = 0;
        long overdueAmount = 0,
            toSend = 0;
        foreach (var payout in unsent)
        {
            if (now < payout.TransferableFrom)
            {
                continue;
            }
            if (payout.ReadyAt == null)
            {
                if (DaysSinceHold(payout, now) >= 30)
                {
                    waiting++;
                }
                continue;
            }
            toSend += payout.Amount;
            if (now > payout.DueAt(calendar))
            {
                overdue++;
                overdueAmount += payout.Amount;
            }
            else if (now > payout.RemindAt(calendar))
            {
                dueSoon++;
            }
            else
            {
                ready++;
            }
        }
        return new(overdue, overdueAmount, dueSoon, ready, waiting, toSend);
    }

    /// <summary>Whole Vietnam days since the hold ended.</summary>
    public static int DaysSinceHold(PayoutTransaction payout, DateTimeOffset now) =>
        LocalDay(now).DayNumber - LocalDay(payout.TransferableFrom).DayNumber;

    private static DateOnly LocalDay(DateTimeOffset at) =>
        DateOnly.FromDateTime(at.ToOffset(VietnamOffset).DateTime);
}
