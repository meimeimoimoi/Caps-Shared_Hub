using Caps.Billing.Application.Abstractions;
using Caps.Contracts;

namespace Caps.Billing.UnitTests;

/// <summary>Keeps the payout notices a handler enqueued, in order.</summary>
internal sealed class FakeNotificationOutbox : IBillingNotificationOutbox
{
    public List<ExpertPayoutNoticeEvent> Sent { get; } = [];

    public List<PayoutDigestEvent> Digests { get; } = [];

    public List<ExpertBankAccountRejectedEvent> Rejections { get; } = [];

    public void Enqueue(ExpertBankAccountRejectedEvent message, DateTimeOffset now) =>
        Rejections.Add(message);

    public void Enqueue(ExpertPayoutNoticeEvent message, DateTimeOffset now) => Sent.Add(message);

    public void Enqueue(PayoutDigestEvent message, DateTimeOffset now) => Digests.Add(message);
}
