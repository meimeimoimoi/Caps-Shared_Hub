using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.Payouts;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.UnitTests;

public sealed class PayoutTransferTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 26, 9, 0, 0, TimeSpan.Zero);
    private static readonly Guid Expert = Guid.NewGuid();

    [Fact]
    public async Task An_accepted_transfer_is_committed_as_processing_before_payos_is_called()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);

        var result = await store.Transfer();

        var order = Assert.Single(store.Gateway.Orders);
        Assert.Equal(PayoutStatus.Processing, store.StatusAtSubmit);
        Assert.Equal(1, store.CommitsAtSubmit);
        Assert.Equal($"{store.Payout.Id:N}-1", order.Reference);
        Assert.Equal(
            ("970422", "0123456789", 450_000L),
            (order.BankBin, order.AccountNumber, order.Amount)
        );
        Assert.Equal(
            ("PROCESSING", "po_1", 1),
            (result.Status, result.ProviderRef, result.AttemptCount)
        );
    }

    [Fact]
    public async Task A_refused_transfer_fails_and_a_retry_is_a_new_reference()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(null, "429: Vượt quá hạn mức");

        var failed = await store.Transfer();
        Assert.Equal(("FAILED", "429: Vượt quá hạn mức"), (failed.Status, failed.LastError));

        store.Gateway.Next = new(new("po_2", PayoutStatus.Succeeded, null), null);
        var paid = await store.Transfer();

        Assert.Equal($"{store.Payout.Id:N}-2", store.Gateway.Orders[1].Reference);
        Assert.Equal(("SUCCEEDED", null, 2), (paid.Status, paid.LastError, paid.AttemptCount));
        Assert.Equal(Now, paid.CompletedAt);
    }

    [Fact]
    public async Task A_processing_or_paid_payout_cannot_be_sent_again()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);
        await store.Transfer();

        var error = await Assert.ThrowsAsync<AppException>(store.Transfer);

        Assert.Equal("PAYOUT_NOT_TRANSFERABLE", error.Code);
        Assert.Single(store.Gateway.Orders);
    }

    [Fact]
    public async Task A_payout_without_an_account_takes_the_current_default_or_is_refused()
    {
        var other = Account(isDefault: false, last4: "1111");
        var fallback = Account(isDefault: true, last4: "2222");
        var store = new Store(null, other, fallback);
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);

        await store.Transfer();
        Assert.Equal(fallback.Id, store.Payout.BankAccountId);
        Assert.Equal("2222", store.Payout.SnapAccountLast4);

        var empty = new Store(null);
        Assert.Equal(
            "PAYOUT_NO_BANK_ACCOUNT",
            (await Assert.ThrowsAsync<AppException>(empty.Transfer)).Code
        );
        Assert.Equal(PayoutStatus.Pending, empty.Payout.Status);
    }

    [Fact]
    public async Task A_lost_answer_stays_processing_until_payos_reports_or_never_received_it()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Throw = true;
        await Assert.ThrowsAsync<AppException>(store.Transfer);
        Assert.Equal(PayoutStatus.Processing, store.Payout.Status);

        // Not found yet, but PayOS may still be receiving it
        store.Gateway.Throw = false;
        store.Gateway.Found = null;
        store.Clock.Now = Now.AddMinutes(2);
        Assert.Equal("PROCESSING", (await store.Refresh()).Status);
        Assert.Equal(store.Payout.Reference, store.Gateway.LookedUp);

        store.Clock.Now = Now.AddMinutes(10);
        var failed = await store.Refresh();
        Assert.Equal(("FAILED", "NOT_RECEIVED"), (failed.Status, failed.LastError));
    }

    [Fact]
    public async Task Refresh_applies_the_reported_outcome_once()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);
        await store.Transfer();

        store.Gateway.Found = new("po_1", PayoutStatus.Failed, "Tài khoản không tồn tại");
        var failed = await store.Refresh();
        Assert.Equal(("FAILED", "Tài khoản không tồn tại"), (failed.Status, failed.LastError));

        store.Gateway.Found = new("po_1", PayoutStatus.Succeeded, null);
        Assert.Equal("FAILED", (await store.Refresh()).Status);
    }

    [Fact]
    public async Task Nothing_is_started_when_the_payout_keys_are_missing()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Available = false;

        Assert.Equal(
            "PAYMENT_UNAVAILABLE",
            (await Assert.ThrowsAsync<AppException>(store.Transfer)).Code
        );
        Assert.Equal(PayoutStatus.Pending, store.Payout.Status);
    }

    private static BankAccount Account(bool isDefault, string last4 = "6789") =>
        BankAccount.Register(
            Expert,
            new("970422", "Vietcombank", "NGUYEN VAN A"),
            new("enc:0123456789", "hash-" + last4, last4),
            isDefault,
            Now
        );

    private sealed class Clock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = PayoutTransferTests.Now;

        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Gateway : IPayoutGateway
    {
        public bool Available { get; set; } = true;
        public bool Throw { get; set; }
        public PayoutSubmission Next { get; set; } = new(null, "unset");
        public PayoutReport? Found { get; set; }
        public string? LookedUp { get; private set; }
        public List<PayoutOrder> Orders { get; } = [];
        public Action? OnSubmit { get; set; }

        public bool IsAvailable => Available;

        public Task<PayoutSubmission> SubmitAsync(PayoutOrder order, CancellationToken ct)
        {
            OnSubmit?.Invoke();
            Orders.Add(order);
            return Throw ? throw BillingErrors.PaymentUnavailable() : Task.FromResult(Next);
        }

        public Task<PayoutReport?> FindAsync(
            string? providerRef,
            string reference,
            CancellationToken ct
        )
        {
            LookedUp = reference;
            return Task.FromResult(Found);
        }
    }

    private sealed class Store
        : IPayoutRepository,
            IBankAccountRepository,
            IAccountNumberProtector,
            IUnitOfWork,
            ITransaction
    {
        private readonly List<BankAccount> accounts;
        private int commits;

        public Store(BankAccount? snapshot, params BankAccount[] others)
        {
            accounts = [.. others];
            if (snapshot != null)
                accounts.Add(snapshot);
            var escrow = Escrow.Hold(Guid.NewGuid(), Guid.NewGuid(), 500_000, Now);
            var settlement = Settlement.ForRelease(escrow, 10, Now);
            Payout = PayoutTransaction.ToExpert(settlement, Expert, snapshot, Now);
            Gateway.OnSubmit = () =>
            {
                StatusAtSubmit = Payout.Status;
                CommitsAtSubmit = commits;
            };
        }

        public PayoutTransaction Payout { get; }
        public Gateway Gateway { get; } = new();
        public Clock Clock { get; } = new();
        public string? StatusAtSubmit { get; private set; }
        public int CommitsAtSubmit { get; private set; }

        public Task<PayoutResponse> Transfer() =>
            new TransferPayoutHandler(this, this, this, Gateway, this, Clock).HandleAsync(
                new(Payout.Id),
                default
            );

        public Task<PayoutResponse> Refresh() =>
            new RefreshPayoutHandler(this, Gateway, this, Clock).HandleAsync(
                new(Payout.Id),
                default
            );

        public Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<PayoutTransaction?>(Payout.Id == id ? Payout : null);

        public Task<IReadOnlyList<PayoutTransaction>> ListAsync(
            string? status,
            int skip,
            int take,
            CancellationToken ct,
            string sortBy = "createdAt",
            bool descending = true
        ) => throw new NotSupportedException();

        public Task<int> CountAsync(string? status, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<BankAccount>> ListAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<BankAccount>>(
                accounts.Where(x => x.UserId == userId && !x.IsDeleted).ToList()
            );

        public Task<IReadOnlyList<BankAccount>> ListForUpdateAsync(
            Guid userId,
            CancellationToken ct
        ) => ListAsync(userId, ct);

        public void Add(BankAccount account) => accounts.Add(account);

        public ProtectedAccountNumber Protect(string normalizedNumber) =>
            throw new NotSupportedException();

        public string Reveal(string encrypted) => encrypted["enc:".Length..];

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

        public Task CommitAsync(CancellationToken ct)
        {
            commits++;
            return Task.CompletedTask;
        }

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
