using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Features.Payments;
using Caps.Billing.Domain;
using Caps.Common.Domain;

namespace Caps.Billing.UnitTests;

public sealed class TopupStatusTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Buyer = Guid.NewGuid();

    private static readonly PaymentTransaction Payment = PaymentTransaction.StartTopup(
        Buyer,
        50_000,
        1792261576000123,
        Now
    );

    private static readonly GetTopupStatusHandler Handler = new(new OnePayment(Payment));

    [Fact]
    public async Task The_buyer_sees_the_status_and_when_the_qr_expires()
    {
        var status = await Handler.HandleAsync(new(Buyer, Payment.Id), CancellationToken.None);

        Assert.Equal(PaymentStatus.Pending, status.Status);
        Assert.Equal(1792261576000123, status.OrderCode);
        Assert.Equal(Now + PaymentRules.LinkLifetime, status.ExpiresAt);
    }

    [Fact]
    public async Task Another_users_payment_is_not_found()
    {
        var e = await Assert.ThrowsAsync<AppException>(() =>
            Handler.HandleAsync(new(Guid.NewGuid(), Payment.Id), CancellationToken.None)
        );

        Assert.Equal("PAYMENT_NOT_FOUND", e.Code);
    }

    private sealed class OnePayment(PaymentTransaction payment) : IPaymentTransactionRepository
    {
        public Task<PaymentTransaction?> FindAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(id == payment.Id ? payment : null);

        public Task<PaymentTransaction?> LockByOrderCodeAsync(
            string orderCode,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public void Add(PaymentTransaction payment) => throw new NotSupportedException();
    }
}
