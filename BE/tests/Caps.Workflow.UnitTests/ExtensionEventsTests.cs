using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

// 2026-11-20: the client hears about an extension request and the expert hears the answer
public sealed class ExtensionEventsTests
{
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();

    [Fact]
    public async Task Asking_for_an_extension_tells_the_client_before_the_commit()
    {
        var reviewCase = InReview();
        var unitOfWork = new FakeUnitOfWork();
        var events = new FakeEvents(unitOfWork);

        await new RequestExtensionHandler(
            new FakeCases(reviewCase),
            events,
            unitOfWork,
            TimeProvider.System
        ).HandleAsync(new(Expert, reviewCase.Id, 2, "Waiting for the tax office"), default);

        var told = Assert.Single(events.Requested);
        Assert.Equal(reviewCase.Id, told.Id);
        Assert.Equal((short)2, told.ExtensionDays);
        Assert.True(events.EnqueuedBeforeCommit);
        Assert.Empty(events.Decided);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task The_clients_answer_tells_the_expert_before_the_commit(bool accept)
    {
        var reviewCase = InReview();
        reviewCase.RequestExtension(
            ExpertProfile,
            1,
            "Need one more day",
            TimeProvider.System.GetUtcNow()
        );
        var unitOfWork = new FakeUnitOfWork();
        var events = new FakeEvents(unitOfWork);

        await new DecideExtensionHandler(
            new FakeCases(reviewCase),
            events,
            unitOfWork,
            TimeProvider.System
        ).HandleAsync(new(Client, reviewCase.Id, accept), default);

        var told = Assert.Single(events.Decided);
        Assert.Equal(
            accept ? ReviewCase.ExtensionAccepted : ReviewCase.ExtensionDeclined,
            told.ExtensionDecision
        );
        Assert.True(events.EnqueuedBeforeCommit);
        Assert.Empty(events.Requested);
    }

    private static ReviewCase InReview()
    {
        var now = TimeProvider.System.GetUtcNow();
        var reviewCase = ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(ExpertProfile, Expert),
                "Check my CIT return",
                null,
                now
            )
            .Case;
        reviewCase.ConfirmPayment(now);
        reviewCase.Accept(ExpertProfile, Expert, now);
        return reviewCase;
    }

    private sealed class FakeEvents(FakeUnitOfWork unitOfWork) : IReviewCaseEvents
    {
        public List<ReviewCase> Requested { get; } = [];
        public List<ReviewCase> Decided { get; } = [];
        public bool EnqueuedBeforeCommit { get; private set; }

        public Task ExtensionRequestedAsync(ReviewCase reviewCase, CancellationToken ct)
        {
            EnqueuedBeforeCommit = !unitOfWork.Committed;
            Requested.Add(reviewCase);
            return Task.CompletedTask;
        }

        public Task ExtensionDecidedAsync(ReviewCase reviewCase, CancellationToken ct)
        {
            EnqueuedBeforeCommit = !unitOfWork.Committed;
            Decided.Add(reviewCase);
            return Task.CompletedTask;
        }

        public Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task InfoRequestedAsync(
            ReviewCase reviewCase,
            InfoRequest request,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task StatusChangedAsync(
            ReviewCase reviewCase,
            ReviewStatusHistory history,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task ResponseDueAsync(
            Guid reviewCaseId,
            Guid expertUserId,
            DateTimeOffset responseDeadline,
            string? expertEmail,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }

    private sealed class FakeUnitOfWork : IUnitOfWork, ITransaction
    {
        public bool Committed { get; private set; }

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

        public Task CommitAsync(CancellationToken ct)
        {
            Committed = true;
            return Task.CompletedTask;
        }

        public ValueTask DisposeAsync() => ValueTask.CompletedTask;
    }

    private sealed class FakeCases(ReviewCase reviewCase) : IReviewCaseRepository
    {
        public Task<ReviewCase?> FindForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult<ReviewCase?>(reviewCase.Id == reviewCaseId ? reviewCase : null);

        public void AddHistory(ReviewStatusHistory history) { }

        public void Add(ReviewCase reviewCase) => throw new NotSupportedException();

        public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<ReviewCase>> ListForUserAsync(
            Guid userId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<Guid>> ListPendingIdsAsync(
            Guid expertUserId,
            string? serviceCode,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }
}
