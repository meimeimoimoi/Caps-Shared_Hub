using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class PayReviewTests
{
    private static readonly Guid Client = Guid.NewGuid();

    [Fact]
    public async Task The_expert_is_told_only_after_the_payment_commits()
    {
        var reviewCase = Requested();
        var tx = new FakeTransaction();
        var events = new FakeEvents(tx);

        await Handler(reviewCase, tx, events, new FakeEscrows())
            .HandleAsync(new(Client, reviewCase.Id), default);

        Assert.Equal([reviewCase.Id], events.Requested);
        Assert.True(events.CommittedFirst);
    }

    [Fact]
    public async Task A_failed_hold_tells_nobody()
    {
        var reviewCase = Requested();
        var tx = new FakeTransaction();
        var events = new FakeEvents(tx);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            Handler(reviewCase, tx, events, new FakeEscrows(fail: true))
                .HandleAsync(new(Client, reviewCase.Id), default)
        );

        Assert.Empty(events.Requested);
    }

    private static ReviewCase Requested() =>
        ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(Guid.NewGuid(), Guid.NewGuid()),
                "Check my CIT return",
                null,
                TimeProvider.System.GetUtcNow()
            )
            .Case;

    private static PayReviewHandler Handler(
        ReviewCase reviewCase,
        FakeTransaction tx,
        FakeEvents events,
        FakeEscrows escrows
    ) =>
        new(
            new FakeCases(reviewCase),
            escrows,
            events,
            new FakeUnitOfWork(tx),
            TimeProvider.System
        );

    private sealed class FakeTransaction : ITransaction
    {
        public bool Committed { get; private set; }

        public Task CommitAsync(CancellationToken ct)
        {
            Committed = true;
            return Task.CompletedTask;
        }

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    private sealed class FakeEvents(FakeTransaction tx) : IReviewCaseEvents
    {
        public List<Guid> Requested { get; } = [];
        public bool CommittedFirst { get; private set; }

        public Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct)
        {
            CommittedFirst = tx.Committed;
            Requested.Add(reviewCase.Id);
            return Task.CompletedTask;
        }

        public Task InfoRequestedAsync(
            ReviewCase reviewCase,
            InfoRequest request,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }

    private sealed class FakeEscrows(bool fail = false) : IEscrows
    {
        public Task HoldAsync(Guid userId, Guid reviewCaseId, long amount, CancellationToken ct) =>
            fail ? throw new InvalidOperationException("billing down") : Task.CompletedTask;

        public Task RefundAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task ReleaseAsync(
            Guid reviewCaseId,
            Guid expertUserId,
            ReviewSettlement settlement,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }

    private sealed class FakeUnitOfWork(FakeTransaction tx) : IUnitOfWork
    {
        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(tx);

        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class FakeCases(ReviewCase reviewCase) : IReviewCaseRepository
    {
        public Task<ReviewCase?> FindForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult<ReviewCase?>(reviewCase.Id == reviewCaseId ? reviewCase : null);

        public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<Guid>> ListPendingIdsAsync(
            Guid expertProfileId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<ReviewCase>> ListForUserAsync(
            Guid userId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public void Add(ReviewCase reviewCase) => throw new NotSupportedException();

        public void AddHistory(ReviewStatusHistory history) { }
    }
}
