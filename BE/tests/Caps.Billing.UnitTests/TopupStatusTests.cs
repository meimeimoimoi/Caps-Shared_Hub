using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Common;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.Payments;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.UnitTests;

public sealed class TopupStatusTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Buyer = Guid.NewGuid();
    private const long OrderCode = 1792261576000123;

    [Fact]
    public async Task The_buyer_sees_the_status_and_when_the_qr_expires()
    {
        var store = new Store();

        var status = await store.Status(Buyer);

        Assert.Equal(PaymentStatus.Pending, status.Status);
        Assert.Equal(OrderCode, status.OrderCode);
        Assert.Equal(Now + PaymentRules.LinkLifetime, status.ExpiresAt);
    }

    [Fact]
    public async Task Another_users_payment_is_not_found_and_payos_is_not_asked()
    {
        var store = new Store();

        var e = await Assert.ThrowsAsync<AppException>(() => store.Status(Guid.NewGuid()));

        Assert.Equal("PAYMENT_NOT_FOUND", e.Code);
        Assert.Equal(0, store.Gateway.Lookups);
    }

    [Fact]
    public async Task A_payment_payos_reports_paid_is_credited_once_without_the_webhook()
    {
        var store = new Store();
        store.Gateway.Report = new(OrderCode, 50_000, Paid: true);

        var status = await store.Status(Buyer);

        Assert.Equal(PaymentStatus.Succeeded, status.Status);
        Assert.Equal(Now, status.PaidAt);
        Assert.Equal(50_000, store.Wallet!.Balance);
        Assert.Single(store.Ledger);

        // Further polls neither ask PayOS again nor credit twice
        await store.Status(Buyer);
        Assert.Equal(1, store.Gateway.Lookups);
        Assert.Single(store.Ledger);
    }

    [Fact]
    public async Task An_unpaid_answer_or_an_unreachable_payos_keeps_the_stored_status()
    {
        var store = new Store();
        store.Gateway.Report = new(OrderCode, 0, Paid: false);
        Assert.Equal(PaymentStatus.Pending, (await store.Status(Buyer)).Status);

        store.Gateway.Report = null; // throws PAYMENT_UNAVAILABLE
        Assert.Equal(PaymentStatus.Pending, (await store.Status(Buyer)).Status);
        Assert.Null(store.Wallet);
    }

    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Gateway : IPaymentGateway
    {
        public PaymentNotice? Report { get; set; } = new(OrderCode, 0, Paid: false);
        public int Lookups { get; private set; }

        public Task<PaymentNotice> FindPaymentAsync(long orderCode, CancellationToken ct)
        {
            Lookups++;
            return Report is { } r ? Task.FromResult(r) : throw BillingErrors.PaymentUnavailable();
        }

        public Task<PaymentLink> CreateLinkAsync(
            PaymentLinkRequest request,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public PaymentNotice ReadNotice(string body) => throw new NotSupportedException();
    }

    private sealed class Store
        : IPaymentTransactionRepository,
            ICreditWalletRepository,
            ICreditLedgerRepository,
            IBillingUserLock,
            IUnitOfWork,
            ITransaction
    {
        private readonly PaymentTransaction payment = PaymentTransaction.StartTopup(
            Buyer,
            50_000,
            OrderCode,
            Now
        );

        public Gateway Gateway { get; } = new();
        public CreditWallet? Wallet { get; private set; }
        public List<CreditLedger> Ledger { get; } = [];

        public Task<TopupStatusResponse> Status(Guid userId)
        {
            var crediting = new TopupCrediting(this, this, this, this, this, new Clock());
            return new GetTopupStatusHandler(this, Gateway, crediting).HandleAsync(
                new(userId, payment.Id),
                CancellationToken.None
            );
        }

        public Task<PaymentTransaction?> FindAsync(Guid id, CancellationToken ct) =>
            Task.FromResult(id == payment.Id ? payment : null);

        public Task<PaymentTransaction?> LockByOrderCodeAsync(
            string orderCode,
            CancellationToken ct
        ) => Task.FromResult(orderCode == payment.OrderCode ? payment : null);

        public void Add(PaymentTransaction p) => throw new NotSupportedException();

        Task<CreditWallet?> ICreditWalletRepository.FindAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult(Wallet);

        public Task<CreditWallet?> FindForUpdateAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult(Wallet);

        public void Add(CreditWallet wallet) => Wallet = wallet;

        public Task<IReadOnlyList<CreditLedger>> ListAsync(
            Guid userId,
            int skip,
            int take,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<int> CountAsync(Guid userId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<CreditLedger?> FindByIdempotencyKeyAsync(
            string idempotencyKey,
            CancellationToken ct
        ) => Task.FromResult(Ledger.SingleOrDefault(x => x.IdempotencyKey == idempotencyKey));

        public void Add(CreditLedger entry) => Ledger.Add(entry);

        public Task AcquireAsync(Guid userId, CancellationToken ct) => Task.CompletedTask;

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

        public Task CommitAsync(CancellationToken ct) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
