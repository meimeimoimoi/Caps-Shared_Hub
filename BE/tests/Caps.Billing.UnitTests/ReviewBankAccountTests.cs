using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.DTOs.Responses;
using Caps.Billing.Application.Features.BankAccounts;
using Caps.Billing.Domain;
using Caps.Common.Application;

namespace Caps.Billing.UnitTests;

public sealed class ReviewBankAccountTests
{
    private static readonly DateTimeOffset Now = new(2026, 12, 10, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Expert = Guid.NewGuid();

    // Payouts waiting for a verified account move to the newly verified default one
    [Fact]
    public async Task Verifying_the_default_account_points_waiting_payouts_at_it()
    {
        var account = PayoutTestAccounts.Account(Expert, Now, verified: false);
        var waiting = Payout();
        var run = new Run(account, waiting);

        await run.ReviewAsync(account.Id, verified: true, reason: null);

        Assert.Equal(BankAccountStatus.Verified, account.Status);
        Assert.Equal(account.Id, waiting.BankAccountId);
        Assert.Empty(run.Outbox.Rejections);
    }

    // Advisor 2026-11-28: the expert is told the account needs updating, with the staff reason
    [Fact]
    public async Task Rejecting_tells_the_expert_why_at_the_email_they_linked_it_with()
    {
        var account = PayoutTestAccounts.Account(Expert, Now, verified: false);
        var waiting = Payout();
        var run = new Run(account, waiting);

        await run.ReviewAsync(account.Id, verified: false, reason: "Tên chủ tài khoản không khớp");

        var notice = Assert.Single(run.Outbox.Rejections);
        Assert.Equal(
            (Expert, "expert@caps.test", "6789", "Tên chủ tài khoản không khớp"),
            (notice.ExpertUserId, notice.Email, notice.AccountLast4, notice.Reason)
        );
        Assert.Null(waiting.BankAccountId);
    }

    private static PayoutTransaction Payout()
    {
        var escrow = Escrow.Hold(Guid.NewGuid(), Guid.NewGuid(), 500_000, Now);
        return PayoutTransaction.ToExpert(
            Settlement.ForRelease(escrow, 10, Now),
            Expert,
            "expert@caps.test",
            null,
            Now
        );
    }

    private sealed class Run(BankAccount account, params PayoutTransaction[] payouts)
        : IBankAccountRepository,
            IAccountNumberProtector,
            IBillingUserLock,
            IPayoutRepository,
            IUnitOfWork,
            ITransaction
    {
        public FakeNotificationOutbox Outbox { get; } = new();

        public Task<ReviewBankAccountResponse> ReviewAsync(
            Guid id,
            bool verified,
            string? reason
        ) =>
            new ReviewBankAccountHandler(
                this,
                this,
                this,
                this,
                new Clock(),
                this,
                Outbox
            ).HandleAsync(new(id, Guid.NewGuid(), verified, reason), default);

        public Task<BankAccount?> FindAsync(Guid id, CancellationToken ct) =>
            Task.FromResult<BankAccount?>(account.Id == id ? account : null);

        public Task<IReadOnlyList<BankAccount>> ListForUpdateAsync(
            Guid userId,
            CancellationToken ct
        ) => Task.FromResult<IReadOnlyList<BankAccount>>([account]);

        public Task<IReadOnlyList<PayoutTransaction>> ListUnsentForAsync(
            Guid recipientUserId,
            CancellationToken ct
        ) => Task.FromResult<IReadOnlyList<PayoutTransaction>>(payouts);

        public string Reveal(string encrypted) => encrypted["enc:".Length..];

        public Task AcquireAsync(Guid userId, CancellationToken ct) => Task.CompletedTask;

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

        public Task CommitAsync(CancellationToken ct) => Task.CompletedTask;

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;

        public ProtectedAccountNumber Protect(string normalizedNumber) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<BankAccount>> ListAsync(Guid userId, CancellationToken ct) =>
            throw new NotSupportedException();

        public void Add(BankAccount account) => throw new NotSupportedException();

        public Task<IReadOnlyList<BankAccount>> ListByStatusAsync(
            string? status,
            int skip,
            int take,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<int> CountByStatusAsync(string? status, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<PayoutTransaction>> ListUnsentAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<PayoutTransaction>> ListAsync(
            PayoutFilter filter,
            int skip,
            int take,
            CancellationToken ct,
            string sortBy = "due",
            bool descending = true
        ) => throw new NotSupportedException();

        public Task<int> CountAsync(PayoutFilter filter, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct) =>
            throw new NotSupportedException();
    }

    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
