using Caps.Billing.Domain;

namespace Caps.Billing.UnitTests;

public sealed class SettlementSplitTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 29, 8, 0, 0, TimeSpan.Zero);
    private static readonly Escrow Held = Escrow.Hold(
        Guid.NewGuid(),
        Guid.NewGuid(),
        1_000_000,
        Now
    );

    [Fact]
    public void A_late_delivery_split_keeps_every_part()
    {
        var settlement = Settlement.ForSplit(Held, 300_000, 200_000, 500_000, Now);

        Assert.Equal(300_000, settlement.UserRefundAmount);
        Assert.Equal(200_000, settlement.PlatformFeeAmount);
        Assert.Equal(500_000, settlement.ExpertPayoutAmount);
        Assert.Equal(SettlementReason.Released, settlement.Reason);
    }

    [Theory]
    [InlineData(300_000, 200_000, 400_000)] // short of the held amount
    [InlineData(300_000, 200_000, 600_000)] // more than the held amount
    [InlineData(-1, 200_000, 800_001)] // negative part
    public void A_split_that_does_not_add_up_is_rejected(long refund, long fee, long payout) =>
        Assert.Equal(
            "SETTLEMENT_MISMATCH",
            Errors.CodeOf(() => Settlement.ForSplit(Held, refund, fee, payout, Now))
        );

    [Fact]
    public void A_partial_refund_entry_records_only_that_amount()
    {
        var wallet = CreditWallet.Open(Guid.NewGuid(), Now);
        var entry = CreditLedger.EscrowRefund(wallet, Held, 300_000, Now);

        Assert.Equal(300_000, entry.Amount);
        Assert.Equal($"escrow:{Held.ReviewCaseId}:refund", entry.IdempotencyKey);
    }
}
