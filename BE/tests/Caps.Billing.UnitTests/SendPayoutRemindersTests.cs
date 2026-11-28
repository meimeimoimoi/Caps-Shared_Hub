using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Features.Payouts;
using Caps.Billing.Domain;
using Caps.Common.Application;
using Caps.Common.Domain;

namespace Caps.Billing.UnitTests;

public sealed class SendPayoutRemindersTests
{
    private static readonly TimeSpan Vn = TimeSpan.FromHours(7);

    // Monday 14/12 09:00 in Vietnam, the daily run
    private static readonly DateTimeOffset Now = new(2026, 12, 14, 9, 0, 0, Vn);
    private static readonly Guid Verified = Guid.NewGuid();
    private static readonly Guid NoAccount = Guid.NewGuid();

    // Advisor 2026-11-28: one daily summary for the inbox; experts without a verified account on days 7, 14, 30
    [Fact]
    public async Task The_daily_run_sums_up_by_deadline_and_reminds_experts_without_an_account()
    {
        var run = new Run(
            Payout(Verified, holdEnds: new(2026, 12, 10, 10, 0, 0, Vn)), // due Mon 14/12 10:00: due soon
            Payout(Verified, holdEnds: new(2026, 12, 14, 8, 0, 0, Vn)), // due Wed 16/12: ready
            Payout(Verified, holdEnds: new(2026, 12, 15, 8, 0, 0, Vn)), // still held: ignored
            Payout(NoAccount, holdEnds: new(2026, 12, 7, 8, 0, 0, Vn)), // overdue, day 7: reminded
            Payout(NoAccount, holdEnds: new(2026, 12, 1, 8, 0, 0, Vn)), // overdue, day 13: not reminded
            Payout(NoAccount, holdEnds: new(2026, 11, 14, 8, 0, 0, Vn)) // overdue, day 30: reminded, waiting
        );

        await run.SendAsync();

        var digest = Assert.Single(run.Outbox.Digests);
        Assert.Equal(
            (3, 1_350_000L, 1, 1, 1),
            (
                digest.Overdue,
                digest.OverdueAmount,
                digest.DueSoon,
                digest.Ready,
                digest.WaitingForAccount
            )
        );
        Assert.Equal(["ACCOUNT_MISSING", "ACCOUNT_MISSING"], run.Outbox.Sent.Select(x => x.Change));
        Assert.All(run.Outbox.Sent, x => Assert.Equal(NoAccount, x.ExpertUserId));
        Assert.Equal(1, run.Saves);
    }

    [Fact]
    public async Task Nothing_ready_sends_no_summary()
    {
        var run = new Run(Payout(Verified, holdEnds: Now.AddDays(1)));

        await run.SendAsync();

        Assert.Empty(run.Outbox.Digests);
        Assert.Empty(run.Outbox.Sent);
    }

    // The payout is created at settlement, a full hold before it may be sent
    private static PayoutTransaction Payout(Guid expert, DateTimeOffset holdEnds)
    {
        var settled = holdEnds.AddDays(-PayoutTransaction.HoldDays);
        var escrow = Escrow.Hold(Guid.NewGuid(), Guid.NewGuid(), 500_000, settled);
        return PayoutTransaction.ToExpert(
            Settlement.ForRelease(escrow, 10, settled),
            expert,
            "expert@caps.test",
            null,
            settled
        );
    }

    private sealed class Run(params PayoutTransaction[] payouts)
        : IPayoutRepository,
            IBankAccountRepository,
            IUnitOfWork
    {
        public FakeNotificationOutbox Outbox { get; } = new();
        public int Saves { get; private set; }

        public Task SendAsync() =>
            new SendPayoutRemindersHandler(
                this,
                this,
                Outbox,
                this,
                new Clock(),
                new WorkCalendar([])
            ).HandleAsync(new(), default);

        public Task<IReadOnlyList<PayoutTransaction>> ListUnsentAsync(CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<PayoutTransaction>>(payouts);

        public Task<IReadOnlyList<BankAccount>> ListAsync(Guid userId, CancellationToken ct)
        {
            IReadOnlyList<BankAccount> accounts = [];
            if (userId == Verified)
            {
                var account = BankAccount.Register(
                    userId,
                    new("970422", "Vietcombank", "NGUYEN VAN A"),
                    new("enc:0123456789", "hash-6789", "6789"),
                    true,
                    Now
                );
                account.Verify(Guid.NewGuid(), Now);
                accounts = [account];
            }
            return Task.FromResult(accounts);
        }

        public Task SaveChangesAsync(CancellationToken ct)
        {
            Saves++;
            return Task.CompletedTask;
        }

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

        public Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<BankAccount>> ListForUpdateAsync(
            Guid userId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public void Add(BankAccount account) => throw new NotSupportedException();

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

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            throw new NotSupportedException();
    }

    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now.ToUniversalTime();
    }
}
