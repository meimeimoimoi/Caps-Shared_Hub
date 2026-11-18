using Caps.Billing.Domain;

namespace Caps.Billing.UnitTests;

public sealed class PaymentTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 18, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Buyer = Guid.NewGuid();

    private static CreditPackage Package(long? price = 50_000, bool onSale = true) =>
        CreditPackage.Create(new("Gói 30", 30, price, onSale, false, 1), Now);

    private static PaymentTransaction Topup() =>
        PaymentTransaction.StartTopup(Buyer, Package(), 1792261576000123, Now);

    [Fact]
    public void A_topup_pays_the_package_price_for_its_credits()
    {
        var payment = Topup();

        Assert.Equal(PaymentPurpose.CreditTopup, payment.Purpose);
        Assert.Equal(PaymentStatus.Pending, payment.Status);
        Assert.Equal(50_000, payment.Amount);
        Assert.Equal(30, payment.Credits);
        Assert.Equal("1792261576000123", payment.OrderCode);
        Assert.Equal(PaymentProvider.PayOs, payment.Provider);
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData(50_000L, false)]
    public void Only_a_priced_package_on_sale_can_be_bought(long? price, bool onSale) =>
        Assert.Equal(
            "CREDIT_PACKAGE_NOT_FOR_SALE",
            Errors.CodeOf(() =>
                PaymentTransaction.StartTopup(Buyer, Package(price, onSale), 1, Now)
            )
        );

    [Fact]
    public void A_payment_succeeds_once_and_only_for_its_exact_amount()
    {
        var payment = Topup();

        Assert.Equal(
            "PAYMENT_AMOUNT_MISMATCH",
            Errors.CodeOf(() => payment.MarkSucceeded(49_000, Now))
        );
        payment.MarkSucceeded(50_000, Now);
        Assert.True(payment.IsSucceeded);
        Assert.Equal(Now, payment.PaidAt);
        Assert.Equal(
            "PAYMENT_ALREADY_SUCCEEDED",
            Errors.CodeOf(() => payment.MarkSucceeded(50_000, Now))
        );
    }

    [Fact]
    public void A_failed_link_can_still_be_paid()
    {
        var payment = Topup();

        payment.MarkFailed();
        Assert.Equal(PaymentStatus.Failed, payment.Status);
        payment.MarkSucceeded(50_000, Now);
        Assert.True(payment.IsSucceeded);
    }

    [Fact]
    public void Crediting_a_wallet_records_the_package_credits_in_the_ledger()
    {
        var payment = Topup();
        var wallet = CreditWallet.Open(Buyer, Now);
        wallet.Credit(20, Now);

        wallet.Credit(payment.Credits, Now);
        var entry = CreditLedger.Topup(wallet, payment, Now);

        Assert.Equal(50, wallet.Balance);
        Assert.Equal(LedgerEntryType.Topup, entry.EntryType);
        Assert.Equal(30, entry.Amount);
        Assert.Equal(50, entry.BalanceAfter);
        Assert.Equal("payos:1792261576000123", entry.IdempotencyKey);
        Assert.Equal(payment.Id, entry.RefPaymentId);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void A_wallet_only_accepts_positive_credits(long amount) =>
        Assert.Equal(
            "INVALID_AMOUNT",
            Errors.CodeOf(() => CreditWallet.Open(Buyer, Now).Credit(amount, Now))
        );
}
