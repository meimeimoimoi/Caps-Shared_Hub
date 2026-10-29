using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class AcceptReviewTests
{
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();

    [Fact]
    public async Task Accepting_takes_the_slot_before_saving()
    {
        var reviewCase = Paid();
        var unitOfWork = new FakeUnitOfWork();
        var slots = new FakeSlots(unitOfWork);

        await Handler(reviewCase, slots, unitOfWork)
            .HandleAsync(new(Expert, reviewCase.Id), default);

        Assert.Equal([(ExpertProfile, reviewCase.Id)], slots.Taken);
        Assert.True(slots.TakenBeforeSave);
        Assert.True(unitOfWork.Committed);
    }

    [Fact]
    public async Task A_full_expert_saves_nothing()
    {
        var reviewCase = Paid();
        var unitOfWork = new FakeUnitOfWork();
        var slots = new FakeSlots(unitOfWork, full: true);

        var e = await Assert.ThrowsAsync<AppException>(() =>
            Handler(reviewCase, slots, unitOfWork).HandleAsync(new(Expert, reviewCase.Id), default)
        );

        Assert.Equal("EXPERT_FULL", e.Code);
        Assert.False(unitOfWork.Saved);
        Assert.False(unitOfWork.Committed);
    }

    private static ReviewCase Paid()
    {
        var reviewCase = ReviewCase
            .Request(
                Client,
                Guid.NewGuid(),
                Guid.NewGuid(),
                new ReviewOffer(
                    ExpertProfile,
                    Expert,
                    Guid.NewGuid(),
                    1_000_000,
                    20,
                    48,
                    24,
                    30,
                    72
                ),
                "Check my CIT return",
                null,
                TimeProvider.System.GetUtcNow()
            )
            .Case;
        reviewCase.ConfirmPayment(TimeProvider.System.GetUtcNow());
        return reviewCase;
    }

    private static AccpetReviewHandler Handler(
        ReviewCase reviewCase,
        FakeSlots slots,
        FakeUnitOfWork unitOfWork
    ) => new(new FakeCases(reviewCase), slots, unitOfWork, TimeProvider.System);

    private sealed class FakeSlots(FakeUnitOfWork unitOfWork, bool full = false) : IExpertSlots
    {
        public List<(Guid, Guid)> Taken { get; } = [];
        public bool TakenBeforeSave { get; private set; }

        public Task TakeAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct)
        {
            if (full)
            {
                throw new AppException(ErrorType.Conflict, "EXPERT_FULL", "Full.");
            }
            TakenBeforeSave = !unitOfWork.Saved;
            Taken.Add((expertProfileId, reviewCaseId));
            return Task.CompletedTask;
        }

        public Task ReleaseAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();
    }

    private sealed class FakeUnitOfWork : IUnitOfWork, ITransaction
    {
        public bool Saved { get; private set; }
        public bool Committed { get; private set; }

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct)
        {
            Saved = true;
            return Task.CompletedTask;
        }

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

        public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<ReviewCase>> ListForUserAsync(
            Guid userId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public void Add(ReviewCase reviewCase) => throw new NotSupportedException();

        public void AddHistory(ReviewStatusHistory history) { }
    }
}
