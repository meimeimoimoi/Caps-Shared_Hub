using Caps.Contracts;

namespace Caps.Billing.Application.Abstractions;

/// <summary>
/// Messages for the notification service, saved in the same transaction as the payout change they describe and
/// published afterwards, so a broker outage never loses or invents a notice.
/// </summary>
public interface IBillingNotificationOutbox
{
    void Enqueue(ExpertPayoutNoticeEvent message, DateTimeOffset now);
    void Enqueue(PayoutDigestEvent message, DateTimeOffset now);
}
