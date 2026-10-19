using Caps.Billing.Domain;

namespace Caps.Billing.UnitTests;

public sealed class EscrowTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 19, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Payer = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid ReviewCase = Guid.NewGuid();

    private static CreditWallet Wallet(long balance)
    {
        var wallet = CreditWallet.Open(Payer, Now);
        wallet.Credit(balance, Now);
        return wallet;
    }

    private static (CreditWallet Wallet, Escrow Escrow) Held(long balance, long amount)
    {
        var wallet = Wallet(balance);
        var escrow = Escrow.Hold(Payer, ReviewCase, amount, Now);
        wallet.Hold(amount, Now);
        return (wallet, escrow);
    }

    [Fact]
    public void Holding_moves_credits_from_the_balance_to_held()
    {
        var (wallet, escrow) = Held(100_000, 60_000);

        Assert.Equal(40_000, wallet.Balance);
        Assert.Equal(60_000, wallet.Held);
        Assert.Equal(EscrowStatus.Held, escrow.Status);

        var entry = CreditLedger.EscrowHold(wallet, escrow, Now);
        Assert.Equal(-60_000, entry.Amount);
        Assert.Equal(40_000, entry.BalanceAfter);
        Assert.Equal($"escrow:{ReviewCase}:hold", entry.IdempotencyKey);
    }

    [Fact]
    public void Holding_more_than_the_balance_is_rejected() =>
        Assert.Equal("INSUFFICIENT_CREDITS", Errors.CodeOf(() => Wallet(10_000).Hold(10_001, Now)));

    [Fact]
    public void Releasing_takes_the_held_credits_out_of_the_wallet()
    {
        var (wallet, escrow) = Held(100_000, 60_000);

        escrow.Release(Now);
        wallet.ReleaseHeld(escrow.Amount, Now);

        Assert.Equal(EscrowStatus.Released, escrow.Status);
        Assert.Equal(40_000, wallet.Balance);
        Assert.Equal(0, wallet.Held);
        Assert.Equal(0, CreditLedger.EscrowRelease(wallet, escrow, Now).Amount);
    }

    [Fact]
    public void Refunding_returns_the_held_credits_to_the_balance()
    {
        var (wallet, escrow) = Held(100_000, 60_000);

        escrow.Refund(Now);
        wallet.RefundHeld(escrow.Amount, Now);
        var settlement = Settlement.ForRefund(escrow, Now);

        Assert.Equal(100_000, wallet.Balance);
        Assert.Equal(0, wallet.Held);
        Assert.Equal(60_000, settlement.UserRefundAmount);
        Assert.Equal(0, settlement.ExpertPayoutAmount);
    }

    [Fact]
    public void An_escrow_is_settled_only_once()
    {
        var (_, escrow) = Held(100_000, 60_000);
        escrow.Release(Now);

        Assert.Equal("ESCROW_NOT_HELD", Errors.CodeOf(() => escrow.Refund(Now)));
        Assert.Equal("ESCROW_NOT_HELD", Errors.CodeOf(() => escrow.Release(Now)));
    }

    [Fact]
    public void The_platform_fee_is_rounded_down_and_the_expert_gets_the_rest()
    {
        var escrow = Escrow.Hold(Payer, ReviewCase, 100_001, Now);

        var settlement = Settlement.ForRelease(escrow, 15, Now);

        Assert.Equal(15_000, settlement.PlatformFeeAmount);
        Assert.Equal(85_001, settlement.ExpertPayoutAmount);
        Assert.Equal(0, settlement.UserRefundAmount);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    public void Platform_fees_outside_0_to_100_percent_are_rejected(int pct) =>
        Assert.Equal(
            "INVALID_PLATFORM_FEE",
            Errors.CodeOf(() =>
                Settlement.ForRelease(Escrow.Hold(Payer, ReviewCase, 1_000, Now), pct, Now)
            )
        );

    [Fact]
    public void The_expert_payout_copies_the_bank_account_snapshot()
    {
        var settlement = Settlement.ForRelease(
            Escrow.Hold(Payer, ReviewCase, 100_000, Now),
            10,
            Now
        );
        var account = BankAccount.Register(
            Expert,
            new("970436", "Vietcombank", "NGUYEN VAN A"),
            new("enc", "hash", "6789"),
            true,
            Now
        );

        var payout = PayoutTransaction.ToExpert(settlement, Expert, account, Now);

        Assert.Equal(90_000, payout.Amount);
        Assert.Equal(PayoutStatus.Pending, payout.Status);
        Assert.Equal(account.Id, payout.BankAccountId);
        Assert.Equal("6789", payout.SnapAccountLast4);
        Assert.Equal("NGUYEN VAN A", payout.SnapHolderName);
    }

    [Fact]
    public void Without_a_bank_account_the_payout_snapshot_stays_empty()
    {
        var settlement = Settlement.ForRelease(
            Escrow.Hold(Payer, ReviewCase, 100_000, Now),
            10,
            Now
        );

        var payout = PayoutTransaction.ToExpert(settlement, Expert, null, Now);

        Assert.Null(payout.BankAccountId);
        Assert.Null(payout.SnapBankBin);
        Assert.Equal(Expert, payout.RecipientUserId);
    }
}
