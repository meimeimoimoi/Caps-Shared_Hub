using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Contracts;

namespace Caps.Billing.Application.Features.Payouts;

/// <summary>The daily payout reminders, sent by the reminder job.</summary>
public sealed record SendPayoutRemindersCommand;

/// <summary>
/// Once a day: the operations inbox gets a summary of the unsent payouts by deadline, and an expert whose payout
/// waits for a verified bank account is reminded 7, 14 and 30 days after the hold ends (advisor 2026-11-28).
/// </summary>
public sealed class SendPayoutRemindersHandler(
    IPayoutRepository payouts,
    IBillingNotificationOutbox outbox,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    WorkCalendar calendar,
    IPayoutGateway gateway
) : ICommandHandler<SendPayoutRemindersCommand>
{
    private static readonly int[] AccountReminderDays = [7, 14, 30];

    public async Task HandleAsync(SendPayoutRemindersCommand command, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        var unsent = await payouts.ListUnsentAsync(ct);
        foreach (var payout in unsent)
        {
            // No verified account: the deadline waits; the expert is reminded on days 7, 14 and 30
            if (
                now >= payout.TransferableFrom
                && payout.ReadyAt == null
                && AccountReminderDays.Contains(PayoutSummary.DaysSinceHold(payout, now))
            )
            {
                PayoutNotices.Enqueue(outbox, payout, now, "ACCOUNT_MISSING");
            }
        }
        var s = PayoutSummary.Of(unsent, now, calendar);
        if (s.Overdue + s.DueSoon + s.Ready + s.WaitingForAccount > 0)
        {
            outbox.Enqueue(
                new PayoutDigestEvent(
                    Guid.NewGuid(),
                    s.Overdue,
                    s.OverdueAmount,
                    s.DueSoon,
                    s.Ready,
                    s.WaitingForAccount,
                    s.AmountToSend,
                    await gateway.GetBalanceAsync(ct),
                    now
                ),
                now
            );
        }
        await unitOfWork.SaveChangesAsync(ct);
    }
}
