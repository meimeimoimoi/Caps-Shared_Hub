using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>How an escrowed amount is split when a review case ends: refund, expert payout and platform fee.</summary>
public sealed class Settlement
{
    public Guid Id { get; set; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; set; }
    public string Reason { get; set; } = default!;
    public long UserRefundAmount { get; set; }
    public long ExpertPayoutAmount { get; set; }
    public long PlatformFeeAmount { get; set; }
    public DateTimeOffset SettledAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<PayoutTransaction> PayoutTransactions { get; set; } =
        new List<PayoutTransaction>();
}
