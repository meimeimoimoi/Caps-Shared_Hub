using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Features.Escrows;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.UnitTests;

/// <summary>The settlement the workflow service asks for when a review case closes, against in-memory stores.</summary>
public sealed class SettleCaseEscrowHandlerTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 15, 8, 0, 0, TimeSpan.Zero);
    private const long Price = 1_000_000;

    [Fact]
    public async Task An_on_time_case_pays_the_expert_and_empties_the_held_credits()
    {
        var run = new Run();
        run.BankAccounts.Add(Account(run.Expert, isDefault: false, "1111"));
        run.BankAccounts.Add(Account(run.Expert, isDefault: true, "2345"));

        await run.SettleAsync(refund: 0, fee: 400_000, payout: 600_000);

        Assert.Equal(EscrowStatus.Released, run.Escrow.Status);
        Assert.Equal(0, run.Wallet.Held);
        Assert.Equal(0, run.Wallet.Balance);
        var settlement = Assert.Single(run.Settlements.Added);
        Assert.Equal(400_000, settlement.PlatformFeeAmount);
        var payout = Assert.Single(settlement.PayoutTransactions);
        Assert.Equal(600_000, payout.Amount);
        Assert.Equal(run.Expert, payout.RecipientUserId);
        Assert.Equal(PayoutStatus.Pending, payout.Status);
        Assert.Equal("2345", payout.SnapAccountLast4);
        Assert.Single(run.Ledger.Added);
        Assert.Equal(1, run.UnitOfWork.Saves);
        Assert.Equal(1, run.UnitOfWork.Commits);
    }

    [Fact]
    public async Task A_late_delivery_returns_the_refund_to_the_client_balance()
    {
        var run = new Run();

        await run.SettleAsync(refund: 500_000, fee: 400_000, payout: 100_000);

        Assert.Equal(500_000, run.Wallet.Balance);
        Assert.Equal(0, run.Wallet.Held);
        Assert.Equal(2, run.Ledger.Added.Count);
        var settlement = Assert.Single(run.Settlements.Added);
        Assert.Equal(500_000, settlement.UserRefundAmount);
        Assert.Equal(100_000, Assert.Single(settlement.PayoutTransactions).Amount);
    }

    [Fact]
    public async Task A_full_refund_creates_no_payout()
    {
        var run = new Run();

        await run.SettleAsync(refund: Price, fee: 0, payout: 0);

        Assert.Equal(Price, run.Wallet.Balance);
        Assert.Empty(Assert.Single(run.Settlements.Added).PayoutTransactions);
        Assert.Single(run.Ledger.Added);
    }

    [Fact]
    public async Task An_expert_without_a_default_account_still_gets_a_pending_payout()
    {
        var run = new Run();
        run.BankAccounts.Add(Account(run.Expert, isDefault: false, "1111"));

        await run.SettleAsync(refund: 0, fee: 400_000, payout: 600_000);

        var payout = Assert.Single(Assert.Single(run.Settlements.Added).PayoutTransactions);
        Assert.Null(payout.BankAccountId);
        Assert.Null(payout.SnapAccountLast4);
    }

    [Fact]
    public async Task Settling_again_pays_nothing_twice()
    {
        var run = new Run();
        await run.SettleAsync(refund: 0, fee: 400_000, payout: 600_000);

        await run.SettleAsync(refund: 0, fee: 400_000, payout: 600_000);

        Assert.Single(run.Settlements.Added);
        Assert.Single(run.Ledger.Added);
        Assert.Equal(1, run.UnitOfWork.Saves);
    }

    [Fact]
    public async Task A_split_that_does_not_add_up_moves_no_credits()
    {
        var run = new Run();

        var error = await Assert.ThrowsAsync<AppException>(() =>
            run.SettleAsync(refund: 0, fee: 400_000, payout: 700_000)
        );

        Assert.Equal("SETTLEMENT_MISMATCH", error.Code);
        Assert.Equal(EscrowStatus.Held, run.Escrow.Status);
        Assert.Equal(Price, run.Wallet.Held);
        Assert.Empty(run.Settlements.Added);
        Assert.Equal(0, run.UnitOfWork.Commits);
    }

    [Fact]
    public async Task A_case_without_an_escrow_is_reported()
    {
        var run = new Run();

        var error = await Assert.ThrowsAsync<AppException>(() =>
            run.Handler.HandleAsync(
                new(Guid.NewGuid(), run.Expert, 0, 400_000, 600_000),
                CancellationToken.None
            )
        );

        Assert.Equal("ESCROW_NOT_FOUND", error.Code);
        Assert.Equal(0, run.UnitOfWork.Commits);
    }

    private static BankAccount Account(Guid owner, bool isDefault, string last4) =>
        BankAccount.Register(
            owner,
            new BankAccountDetails("970436", "Vietcombank", "NGUYEN VAN A"),
            new ProtectedAccountNumber("cipher", "hash" + last4, last4),
            isDefault,
            Now
        );

    /// <summary>One client with the case price held in escrow, and the handler wired to in-memory stores.</summary>
    private sealed class Run
    {
        public Guid Expert { get; } = Guid.NewGuid();
        public Guid CaseId { get; } = Guid.NewGuid();
        public CreditWallet Wallet { get; }
        public Escrow Escrow { get; }
        public Settlements Settlements { get; } = new();
        public Ledger Ledger { get; } = new();
        public BankAccounts BankAccounts { get; } = new();
        public UnitOfWork UnitOfWork { get; } = new();
        public SettleCaseEscrowHandler Handler { get; }

        public Run()
        {
            var client = Guid.NewGuid();
            Wallet = CreditWallet.Open(client, Now);
            Wallet.Credit(Price, Now);
            Wallet.Hold(Price, Now);
            Escrow = Escrow.Hold(client, CaseId, Price, Now);
            Handler = new SettleCaseEscrowHandler(
                new Escrows(Escrow),
                new Wallets(Wallet),
                Ledger,
                Settlements,
                BankAccounts,
                new UserLock(),
                UnitOfWork,
                new FixedClock()
            );
        }

        public Task SettleAsync(long refund, long fee, long payout) =>
            Handler.HandleAsync(new(CaseId, Expert, refund, fee, payout), CancellationToken.None);
    }

    private sealed class FixedClock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private sealed class Escrows(Escrow escrow) : IEscrowRepository
    {
        public Task<Escrow?> LockByReviewCaseAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult(escrow.ReviewCaseId == reviewCaseId ? escrow : null);

        public void Add(Escrow added) => throw new NotSupportedException();
    }

    private sealed class Wallets(CreditWallet wallet) : ICreditWalletRepository
    {
        public Task<CreditWallet?> FindAsync(Guid userId, CancellationToken ct) =>
            FindForUpdateAsync(userId, ct);

        public Task<CreditWallet?> FindForUpdateAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult(wallet.UserId == userId ? wallet : null);

        public void Add(CreditWallet added) => throw new NotSupportedException();
    }

    private sealed class Ledger : ICreditLedgerRepository
    {
        public List<CreditLedger> Added { get; } = [];

        public Task<IReadOnlyList<CreditLedger>> ListAsync(
            Guid userId,
            int skip,
            int take,
            CancellationToken ct
        ) => Task.FromResult<IReadOnlyList<CreditLedger>>(Added);

        public Task<int> CountAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult(Added.Count);

        public Task<CreditLedger?> FindByIdempotencyKeyAsync(
            string idempotencyKey,
            CancellationToken ct
        ) => Task.FromResult(Added.FirstOrDefault(x => x.IdempotencyKey == idempotencyKey));

        public void Add(CreditLedger entry) => Added.Add(entry);
    }

    private sealed class Settlements : ISettlementRepository
    {
        public List<Settlement> Added { get; } = [];

        public void Add(Settlement settlement) => Added.Add(settlement);
    }

    private sealed class BankAccounts : IBankAccountRepository
    {
        private readonly List<BankAccount> accounts = [];

        public Task<IReadOnlyList<BankAccount>> ListAsync(Guid userId, CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<BankAccount>>(
                accounts.Where(x => x.UserId == userId).ToList()
            );

        public Task<IReadOnlyList<BankAccount>> ListForUpdateAsync(
            Guid userId,
            CancellationToken ct
        ) => ListAsync(userId, ct);

        public void Add(BankAccount account) => accounts.Add(account);
    }

    private sealed class UserLock : IBillingUserLock
    {
        public Task AcquireAsync(Guid userId, CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class UnitOfWork : IUnitOfWork
    {
        public int Saves { get; private set; }
        public int Commits { get; private set; }

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(new Transaction(this));

        public Task SaveChangesAsync(CancellationToken ct)
        {
            Saves++;
            return Task.CompletedTask;
        }

        private sealed class Transaction(UnitOfWork owner) : ITransaction
        {
            public Task CommitAsync(CancellationToken ct)
            {
                owner.Commits++;
                return Task.CompletedTask;
            }

            public ValueTask DisposeAsync() => ValueTask.CompletedTask;
        }
    }
}
