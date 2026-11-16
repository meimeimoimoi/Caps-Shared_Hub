using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Features.AiCredits;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.UnitTests;

public sealed class AiCreditTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 15, 10, 0, 0, TimeSpan.Zero);
    private static readonly Guid User = Guid.NewGuid();
    private static readonly Guid UsageId = Guid.NewGuid();
    private static readonly Guid DraftVersionId = Guid.NewGuid();

    [Fact]
    public async Task Holding_and_capturing_ai_credits_updates_wallet_and_records_ledger_references()
    {
        var store = new Store(User, balance: 5_000);
        var hold = new HoldAiCreditHandler(store, store, store, store, new FixedClock());
        var capture = new CaptureAiCreditHandler(store, store, store, store, new FixedClock());

        await hold.HandleAsync(new(User, UsageId, 1_000, "AI chat"), default);
        await hold.HandleAsync(new(User, UsageId, 1_000, "AI chat"), default); // idempotent retry
        await capture.HandleAsync(new(UsageId, DraftVersionId, "AI captured"), default);
        await capture.HandleAsync(new(UsageId, DraftVersionId, "AI captured"), default); // idempotent retry

        Assert.Equal(4_000, store.Wallet.Balance);
        Assert.Equal(0, store.Wallet.Held);
        Assert.Equal(2, store.Ledgers.Count);

        var holdEntry = store.Ledgers[0];
        Assert.Equal(LedgerEntryType.Hold, holdEntry.EntryType);
        Assert.Equal(-1_000, holdEntry.Amount);
        Assert.Equal(4_000, holdEntry.BalanceAfter);
        Assert.Equal(UsageId, holdEntry.RefAiUsageId);
        Assert.Null(holdEntry.RefDocumentVersionId);

        var captureEntry = store.Ledgers[1];
        Assert.Equal(LedgerEntryType.Capture, captureEntry.EntryType);
        Assert.Equal(0, captureEntry.Amount);
        Assert.Equal(4_000, captureEntry.BalanceAfter);
        Assert.Equal(UsageId, captureEntry.RefAiUsageId);
        Assert.Equal(DraftVersionId, captureEntry.RefDocumentVersionId);
    }

    [Fact]
    public async Task Holding_and_releasing_ai_credits_returns_amount_to_balance()
    {
        var store = new Store(User, balance: 5_000);
        var hold = new HoldAiCreditHandler(store, store, store, store, new FixedClock());
        var release = new ReleaseAiCreditHandler(store, store, store, store, new FixedClock());

        await hold.HandleAsync(new(User, UsageId, 2_000, "AI draft"), default);
        Assert.Equal((3_000, 2_000), (store.Wallet.Balance, store.Wallet.Held));

        await release.HandleAsync(new(UsageId, "AI failed"), default);
        await release.HandleAsync(new(UsageId, "AI failed"), default); // idempotent retry

        Assert.Equal((5_000, 0), (store.Wallet.Balance, store.Wallet.Held));
        Assert.Equal(2, store.Ledgers.Count);
        Assert.Equal(LedgerEntryType.Release, store.Ledgers[1].EntryType);
        Assert.Equal(2_000, store.Ledgers[1].Amount);
        Assert.Equal(5_000, store.Ledgers[1].BalanceAfter);
    }

    [Fact]
    public async Task Rejects_insufficient_balance_conflicts_and_cross_settlement_calls()
    {
        var emptyStore = new Store(User, balance: 500);
        var emptyHold = new HoldAiCreditHandler(
            emptyStore,
            emptyStore,
            emptyStore,
            emptyStore,
            new FixedClock()
        );

        var lowEx = await Assert.ThrowsAsync<AppException>(() =>
            emptyHold.HandleAsync(new(User, UsageId, 1_000, null), default)
        );
        Assert.Equal("INSUFFICIENT_CREDITS", lowEx.Code);

        var store = new Store(User, balance: 5_000);
        var hold = new HoldAiCreditHandler(store, store, store, store, new FixedClock());
        var capture = new CaptureAiCreditHandler(store, store, store, store, new FixedClock());
        var release = new ReleaseAiCreditHandler(store, store, store, store, new FixedClock());

        var missingEx = await Assert.ThrowsAsync<AppException>(() =>
            capture.HandleAsync(new(UsageId, null, null), default)
        );
        Assert.Equal("AI_CREDIT_HOLD_NOT_FOUND", missingEx.Code);

        await hold.HandleAsync(new(User, UsageId, 1_000, null), default);

        var conflictEx = await Assert.ThrowsAsync<AppException>(() =>
            hold.HandleAsync(new(User, UsageId, 2_000, null), default)
        );
        Assert.Equal("AI_CREDIT_HOLD_CONFLICT", conflictEx.Code);

        await capture.HandleAsync(new(UsageId, null, null), default);

        var releaseClosedEx = await Assert.ThrowsAsync<AppException>(() =>
            release.HandleAsync(new(UsageId, null), default)
        );
        Assert.Equal("AI_CREDIT_HOLD_CLOSED", releaseClosedEx.Code);

        var reholdClosedEx = await Assert.ThrowsAsync<AppException>(() =>
            hold.HandleAsync(new(User, UsageId, 1_000, null), default)
        );
        Assert.Equal("AI_CREDIT_HOLD_CLOSED", reholdClosedEx.Code);
    }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Store
        : ICreditWalletRepository,
            ICreditLedgerRepository,
            IBillingUserLock,
            IUnitOfWork,
            ITransaction
    {
        public Store(Guid userId, long balance)
        {
            Wallet = CreditWallet.Open(userId, Now);
            if (balance > 0)
            {
                Wallet.Credit(balance, Now);
            }
        }

        public CreditWallet Wallet { get; }
        public List<CreditLedger> Ledgers { get; } = [];

        public Task<CreditWallet?> FindAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult<CreditWallet?>(Wallet.UserId == userId ? Wallet : null);

        public Task<CreditWallet?> FindForUpdateAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult<CreditWallet?>(Wallet.UserId == userId ? Wallet : null);

        public void Add(CreditWallet wallet) { }

        public Task<IReadOnlyList<CreditLedger>> ListAsync(
            Guid userId,
            int skip,
            int take,
            CancellationToken ct
        ) =>
            Task.FromResult<IReadOnlyList<CreditLedger>>(
                Ledgers.Where(x => x.UserId == userId).Skip(skip).Take(take).ToList()
            );

        public Task<int> CountAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult(Ledgers.Count(x => x.UserId == userId));

        public Task<CreditLedger?> FindByIdempotencyKeyAsync(
            string idempotencyKey,
            CancellationToken ct
        ) => Task.FromResult(Ledgers.SingleOrDefault(x => x.IdempotencyKey == idempotencyKey));

        public void Add(CreditLedger entry) => Ledgers.Add(entry);

        public Task AcquireAsync(Guid userId, CancellationToken ct) => Task.CompletedTask;

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

        public Task CommitAsync(CancellationToken ct) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }
}
