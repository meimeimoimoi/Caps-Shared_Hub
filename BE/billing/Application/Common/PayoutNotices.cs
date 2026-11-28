using Caps.Billing.Application.Abstractions;
using Caps.Billing.Domain;
using Caps.Contracts;

namespace Caps.Billing.Application.Common;

/// <summary>Tells the expert what happened to a payout, once per status change that matters to them.</summary>
public static class PayoutNotices
{
    public static void Enqueue(
        IBillingNotificationOutbox outbox,
        PayoutTransaction payout,
        DateTimeOffset now,
        string? change = null
    )
    {
        change ??= payout.Status switch
        {
            PayoutStatus.Pending => "RECORDED",
            PayoutStatus.Succeeded => "SUCCEEDED",
            PayoutStatus.Failed when payout.AttemptsExhausted => "ACCOUNT_NEEDED",
            PayoutStatus.Failed => "FAILED",
            _ => null,
        };
        if (change == null)
            return;
        outbox.Enqueue(
            new ExpertPayoutNoticeEvent(
                Guid.NewGuid(),
                payout.RecipientUserId,
                payout.RecipientEmail,
                payout.Id,
                payout.Amount,
                change,
                payout.TransferableFrom,
                now
            ),
            now
        );
    }
}
