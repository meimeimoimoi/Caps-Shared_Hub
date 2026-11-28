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
            Payout(Verified, holdEnds: new(2026, 12, 1, 8, 0, 0, Vn)), // due Thu 03/12: overdue
            Payout(Verified, holdEnds: new(2026, 12, 15, 8, 0, 0, Vn)), // still held: ignored
            Payout(NoAccount, holdEnds: new(2026, 12, 7, 8, 0, 0, Vn)), // no deadline, day 7: reminded
            Payout(NoAccount, holdEnds: new(2026, 12, 1, 8, 0, 0, Vn)), // no deadline, day 13: quiet
            Payout(NoAccount, holdEnds: new(2026, 11, 14, 8, 0, 0, Vn)) // day 30: reminded, waiting
        );

        await run.SendAsync();

        var digest = Assert.Single(run.Outbox.Digests);
        Assert.Equal(
            (1, 450_000L, 1, 1, 1),
            (
                digest.Overdue,
                digest.OverdueAmount,
                digest.DueSoon,
                digest.Ready,
                digest.WaitingForAccount
            )
        );
        // Due soon + ready + overdue need 3 x 450,000 against a 500,000 balance: the digest says so
        Assert.Equal((1_350_000L, 500_000L), (digest.AmountToSend, digest.Balance));
        Assert.Equal(["ACCOUNT_MISSING", "ACCOUNT_MISSING"], run.Outbox.Sent.Select(x => x.Change));
        Assert.All(run.Outbox.Sent, x => Assert.Equal(NoAccount, x.ExpertUserId));
        Assert.Equal(1, run.Saves);
    }

    // Advisor 2026-11-28: once the account is verified after the hold, staff get 2 working days from then
    [Fact]
    public void The_deadline_starts_when_the_account_is_verified_after_the_hold()
    {
        var holdEnds = new DateTimeOffset(2026, 12, 7, 8, 0, 0, Vn);
        var waiting = Payout(NoAccount, holdEnds);
        Assert.Null(waiting.DueAt(WorkCalendar.WeekendsOnly));

        // Verified Thursday 10/12 15:00: deadline Monday 14/12 15:00, not two working days after the hold
        var verifiedAt = new DateTimeOffset(2026, 12, 10, 15, 0, 0, Vn);
        waiting.WithAccount(PayoutTestAccounts.Account(NoAccount, verifiedAt, verified: true));

        Assert.Equal(verifiedAt, waiting.ReadyAt);
        Assert.Equal(
            new DateTimeOffset(2026, 12, 14, 15, 0, 0, Vn),
            waiting.DueAt(WorkCalendar.WeekendsOnly)
        );
    }

    // A held payout waits for its review, not for an account: no reminder, and staff hear once it is overdue
    [Fact]
    public async Task A_held_payout_is_counted_past_review_and_never_asked_for_an_account()
    {
        var held = Payout(NoAccount, holdEnds: new(2026, 11, 30, 8, 0, 0, Vn)); // day 14 if it were not held
        held.Hold(
            Guid.NewGuid(),
            "Khách phản ánh sau khi hoàn tất",
            7,
            new(2026, 12, 1, 9, 0, 0, Vn)
        );
        var run = new Run(held);

        await run.SendAsync();

        Assert.Empty(run.Outbox.Sent);
        var digest = Assert.Single(run.Outbox.Digests);
        Assert.Equal((1, 0), (digest.HeldPastReview, digest.WaitingForAccount));
    }

    // Lifting a hold restarts the 2 working days from the release
    [Fact]
    public void Releasing_a_hold_restarts_the_deadline()
    {
        var payout = Payout(Verified, holdEnds: new(2026, 12, 7, 8, 0, 0, Vn));
        var released = new DateTimeOffset(2026, 12, 10, 15, 0, 0, Vn);
        payout.Hold(Guid.NewGuid(), "Khách phản ánh sau khi hoàn tất", 7, released.AddDays(-1));
        Assert.Null(payout.DueAt(WorkCalendar.WeekendsOnly));

        payout.Release(Guid.NewGuid(), "Phản ánh không có căn cứ", released);

        Assert.Equal(released, payout.ReadyAt);
        Assert.Equal(
            new DateTimeOffset(2026, 12, 14, 15, 0, 0, Vn),
            payout.DueAt(WorkCalendar.WeekendsOnly)
        );
    }

    [Fact]
    public async Task Nothing_ready_sends_no_summary()
    {
        var run = new Run(Payout(Verified, holdEnds: Now.AddDays(1)));

        await run.SendAsync();

        Assert.Empty(run.Outbox.Digests);
        Assert.Empty(run.Outbox.Sent);
    }

    // Created at settlement, a full hold before it may be sent; Verified experts' accounts were checked long ago
    private static PayoutTransaction Payout(Guid expert, DateTimeOffset holdEnds)
    {
        var settled = holdEnds.AddDays(-PayoutTransaction.HoldDays);
        var escrow = Escrow.Hold(Guid.NewGuid(), Guid.NewGuid(), 500_000, settled);
        var account =
            expert == Verified
                ? PayoutTestAccounts.Account(expert, settled.AddDays(-30), verified: true)
                : null;
        var payout = PayoutTransaction.ToExpert(
            Settlement.ForRelease(escrow, 10, settled),
            expert,
            "expert@caps.test",
            account,
            settled
        );
        return account == null ? payout : payout.WithAccount(account);
    }

    private sealed class Run(params PayoutTransaction[] payouts)
        : IPayoutRepository,
            IUnitOfWork,
            IPayoutGateway
    {
        public FakeNotificationOutbox Outbox { get; } = new();
        public int Saves { get; private set; }
        public long? Balance { get; set; } = 500_000;

        public bool IsAvailable => true;

        public Task<long?> GetBalanceAsync(CancellationToken ct) => Task.FromResult(Balance);

        public Task<PayoutSubmission> SubmitAsync(PayoutOrder order, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<PayoutReport?> FindAsync(
            string? providerRef,
            string reference,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task SendAsync() =>
            new SendPayoutRemindersHandler(
                this,
                Outbox,
                this,
                new Clock(),
                new WorkCalendar([]),
                this
            ).HandleAsync(new(), default);

        public Task<IReadOnlyList<PayoutTransaction>> ListUnsentAsync(CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<PayoutTransaction>>(payouts);

        public Task SaveChangesAsync(CancellationToken ct)
        {
            Saves++;
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<PayoutTransaction>> ListUnsentForAsync(
            Guid recipientUserId,
            CancellationToken ct
        ) => throw new NotSupportedException();

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

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            throw new NotSupportedException();
    }

    private sealed class Clock : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => Now.ToUniversalTime();
    }
}
