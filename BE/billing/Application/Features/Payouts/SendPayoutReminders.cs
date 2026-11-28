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
    IBankAccountRepository bankAccounts,
    IBillingNotificationOutbox outbox,
    IUnitOfWork unitOfWork,
    TimeProvider clock,
    WorkCalendar calendar
) : ICommandHandler<SendPayoutRemindersCommand>
{
    private static readonly int[] AccountReminderDays = [7, 14, 30];
    private static readonly TimeSpan VietnamOffset = TimeSpan.FromHours(7);

    public async Task HandleAsync(SendPayoutRemindersCommand command, CancellationToken ct)
    {
        var now = clock.GetUtcNow();
        int overdue = 0,
            dueSoon = 0,
            ready = 0,
            waiting = 0;
        long overdueAmount = 0;
        foreach (var payout in await payouts.ListUnsentAsync(ct))
        {
            if (now < payout.TransferableFrom)
            {
                continue;
            }
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

            // ponytail: one bank account lookup per payout; batch it if unsent payouts reach the thousands
            var account = await bankAccounts.ListAsync(payout.RecipientUserId, ct);
            if (account.Any(x => x.IsVerified))
            {
                continue;
            }
            var days = LocalDay(now).DayNumber - LocalDay(payout.TransferableFrom).DayNumber;
            if (days >= 30)
            {
                waiting++;
            }
            if (AccountReminderDays.Contains(days))
            {
                PayoutNotices.Enqueue(outbox, payout, now, "ACCOUNT_MISSING");
            }
        }
        if (overdue + dueSoon + ready + waiting > 0)
        {
            outbox.Enqueue(
                new PayoutDigestEvent(
                    Guid.NewGuid(),
                    overdue,
                    overdueAmount,
                    dueSoon,
                    ready,
                    waiting,
                    now
                ),
                now
            );
        }
        await unitOfWork.SaveChangesAsync(ct);
    }

    private static DateOnly LocalDay(DateTimeOffset at) =>
        DateOnly.FromDateTime(at.ToOffset(VietnamOffset).DateTime);
}
