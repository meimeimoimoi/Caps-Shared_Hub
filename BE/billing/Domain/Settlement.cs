using Caps.Common.Domain;

namespace Caps.Billing.Domain;

/// <summary>How an escrowed amount is split when a review case ends: refund, expert payout and platform fee.</summary>
public sealed class Settlement
{
    private Settlement() { }

    public Guid Id { get; } = UuidV7.NewGuid();
    public Guid ReviewCaseId { get; private set; }
    public string Reason { get; private set; } = default!;
    public long UserRefundAmount { get; private set; }
    public long ExpertPayoutAmount { get; private set; }
    public long PlatformFeeAmount { get; private set; }
    public DateTimeOffset SettledAt { get; private set; }

    public ICollection<PayoutTransaction> PayoutTransactions { get; private set; } = [];

    /// <summary>
    /// The whole escrow goes to the expert minus the platform fee, rounded down in the expert's favour.
    /// </summary>
    public static Settlement ForRelease(Escrow escrow, int platformFeePct, DateTimeOffset now)
    {
        if (platformFeePct is < 0 or > 100)
            throw BillingErrors.InvalidPlatformFee();
        var fee = escrow.Amount * platformFeePct / 100;
        return new()
        {
            ReviewCaseId = escrow.ReviewCaseId,
            Reason = SettlementReason.Released,
            ExpertPayoutAmount = escrow.Amount - fee,
            PlatformFeeAmount = fee,
            SettledAt = now,
        };
    }

    /// <summary>The whole escrow goes back to the payer's credits.</summary>
    public static Settlement ForRefund(Escrow escrow, DateTimeOffset now) =>
        new()
        {
            ReviewCaseId = escrow.ReviewCaseId,
            Reason = SettlementReason.Refunded,
            UserRefundAmount = escrow.Amount,
            SettledAt = now,
        };
}

/// <summary>Why an escrow was settled.</summary>
public static class SettlementReason
{
    public const string Released = "RELEASED";
    public const string Refunded = "REFUNDED";
}
