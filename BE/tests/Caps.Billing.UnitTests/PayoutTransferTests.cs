using System.Globalization;
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
    private static readonly Guid Staff = Guid.NewGuid();

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
    public async Task Money_only_goes_to_a_verified_account()
    {
        var unverified = new Store(Account(isDefault: true, verified: false));
        Assert.Equal(
            "PAYOUT_ACCOUNT_NOT_VERIFIED",
            (await Assert.ThrowsAsync<AppException>(unverified.Transfer)).Code
        );
        Assert.Equal(PayoutStatus.Pending, unverified.Payout.Status);
        Assert.Empty(unverified.Gateway.Orders);

        // The snapshot account is still unverified, but the expert's new default is verified
        var fallback = Account(isDefault: true, last4: "2222");
        var store = new Store(Account(isDefault: false, verified: false), fallback);
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);

        await store.Transfer();

        Assert.Equal(fallback.Id, store.Payout.BankAccountId);
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

    // Audit trail: every status change is added once, with who started the attempt and to which account
    [Fact]
    public async Task Each_status_change_is_kept_with_who_sent_it_and_where()
    {
        var store = new Store(Account(isDefault: true));
        store.Gateway.Next = new(new("po_1", PayoutStatus.Processing, null), null);
        await store.Transfer();
        store.Gateway.Found = new("po_1", PayoutStatus.Processing, null);
        await store.Refresh();
        store.Gateway.Found = new("po_1", PayoutStatus.Succeeded, null);

        var paid = await store.Refresh();

        Assert.Equal(
            [
                ("PENDING", 0, (string?)null, (string?)null),
                ("PROCESSING", 1, Staff.ToString(), (string?)null),
                ("PROCESSING", 1, null, "po_1"),
                ("SUCCEEDED", 1, null, "po_1"),
            ],
            paid.History.Select(h => (h.Status, h.AttemptNo, h.ActorUserId, h.Note))
        );
        Assert.All(paid.History.Skip(1), h => Assert.Equal("6789", h.AccountLast4));
    }

    // Staff have 2 working days after the hold; reminded 1 working day before (advisor 2026-11-28)
    [Theory]
    // Settled Saturday 28/11 10:00: hold ends Saturday 05/12, reminder Monday 07/12, deadline Tuesday 08/12
    [InlineData(
        "2026-11-28T10:00:00+07:00",
        "2026-12-07T10:00:00+07:00",
        "2026-12-08T10:00:00+07:00"
    )]
    // Hold ends Tuesday 01/09: 02/09 is a public holiday, so reminder Thursday 03/09 and deadline Friday 04/09
    [InlineData(
        "2026-08-25T10:00:00+07:00",
        "2026-09-03T10:00:00+07:00",
        "2026-09-04T10:00:00+07:00"
    )]
    public void The_deadline_counts_working_days_after_the_hold(
        string settled,
        string remind,
        string due
    )
    {
        var at = DateTimeOffset.Parse(settled, CultureInfo.InvariantCulture);
        var escrow = Escrow.Hold(Guid.NewGuid(), Guid.NewGuid(), 500_000, at);
        var payout = PayoutTransaction.ToExpert(
            Settlement.ForRelease(escrow, 10, at),
            Expert,
            null,
            at
        );
        var calendar = new WorkCalendar(["09-02"]);

        Assert.Equal(
            DateTimeOffset.Parse(remind, CultureInfo.InvariantCulture),
            payout.RemindAt(calendar)
        );
        Assert.Equal(
            DateTimeOffset.Parse(due, CultureInfo.InvariantCulture),
            payout.DueAt(calendar)
        );
    }

    // Held for 7 calendar days after settlement (agreed with the advisor on 2026-11-28)
    [Fact]
    public async Task A_payout_cannot_be_sent_before_the_hold_ends()
    {
        var store = new Store(Account(isDefault: true));
        store.Clock.Now = store.Payout.TransferableFrom.AddMinutes(-1);

        var error = await Assert.ThrowsAsync<AppException>(store.Transfer);

        Assert.Equal("PAYOUT_ON_HOLD", error.Code);
        Assert.Equal(PayoutStatus.Pending, store.Payout.Status);
        Assert.Empty(store.Gateway.Orders);
    }

    // The first send and three retries; after that only another verified account is tried
    [Fact]
    public async Task After_the_last_failed_attempt_only_a_new_account_is_tried()
    {
        var first = Account(isDefault: true);
        var store = new Store(first);
        store.Gateway.Next = new(null, "Sai số tài khoản");
        for (var i = 0; i < PayoutTransaction.MaxAttempts; i++)
            await store.Transfer();

        var error = await Assert.ThrowsAsync<AppException>(store.Transfer);
        Assert.Equal("PAYOUT_ATTEMPTS_EXHAUSTED", error.Code);
        Assert.True(PayoutResponse.From(store.Payout, WorkCalendar.WeekendsOnly).AttemptsExhausted);
        Assert.Equal(PayoutTransaction.MaxAttempts, store.Gateway.Orders.Count);

        // The expert removes the wrong account and links a new one, which staff verify
        first.Delete(Now);
        var second = Account(isDefault: true, last4: "2222");
        store.Add(second);
        store.Gateway.Next = new(new("po_5", PayoutStatus.Processing, null), null);

        var sent = await store.Transfer();

        Assert.Equal(("PROCESSING", "2222"), (sent.Status, sent.AccountLast4));
        Assert.Equal(second.Id, store.Payout.BankAccountId);
    }

    private static BankAccount Account(bool isDefault, string last4 = "6789", bool verified = true)
    {
        var account = BankAccount.Register(
            Expert,
            new("970422", "Vietcombank", "NGUYEN VAN A"),
            new("enc:0123456789", "hash-" + last4, last4),
            isDefault,
            Now
        );
        if (verified)
            account.Verify(Guid.NewGuid(), Now);
        return account;
    }

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
            // Settled a full hold ago, so the payout may be sent at Now
            Payout = PayoutTransaction.ToExpert(
                settlement,
                Expert,
                snapshot,
                Now.AddDays(-PayoutTransaction.HoldDays)
            );
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
            new TransferPayoutHandler(
                this,
                this,
                this,
                Gateway,
                this,
                Clock,
                WorkCalendar.WeekendsOnly
            ).HandleAsync(new(Payout.Id, Staff), default);

        public Task<PayoutResponse> Refresh() =>
            new RefreshPayoutHandler(
                this,
                Gateway,
                this,
                Clock,
                WorkCalendar.WeekendsOnly
            ).HandleAsync(new(Payout.Id), default);

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

        public Task<BankAccount?> FindAsync(Guid id, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<BankAccount>> ListByStatusAsync(
            string? status,
            int skip,
            int take,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<int> CountByStatusAsync(string? status, CancellationToken ct) =>
            throw new NotSupportedException();

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
