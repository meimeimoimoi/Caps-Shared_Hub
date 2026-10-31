using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain;
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

        await Handler(slots, unitOfWork, new FakeEscrows(), reviewCase)
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
            Handler(slots, unitOfWork, new FakeEscrows(), reviewCase)
                .HandleAsync(new(Expert, reviewCase.Id), default)
        );

        Assert.Equal("EXPERT_FULL", e.Code);
        Assert.False(unitOfWork.Saved);
        Assert.False(unitOfWork.Committed);
    }

    [Fact]
    public async Task Taking_the_last_slot_refunds_the_other_waiting_requests()
    {
        var accepted = Paid();
        var waiting = Paid();
        var unitOfWork = new FakeUnitOfWork();
        var escrows = new FakeEscrows();

        await Handler(
                new FakeSlots(unitOfWork, freeLeft: 0),
                unitOfWork,
                escrows,
                accepted,
                waiting
            )
            .HandleAsync(new(Expert, accepted.Id), default);

        Assert.Equal(ReviewCaseStatus.InReview, accepted.Status);
        Assert.Equal(ReviewCaseStatus.ExpertDeclined, waiting.Status);
        Assert.Equal(ReviewCase.ExpertFull, waiting.DeclineReason);
        Assert.Equal([waiting.Id], escrows.Refunded);
    }

    [Fact]
    public async Task A_slot_left_keeps_the_other_requests_waiting()
    {
        var accepted = Paid();
        var waiting = Paid();
        var unitOfWork = new FakeUnitOfWork();
        var escrows = new FakeEscrows();

        await Handler(
                new FakeSlots(unitOfWork, freeLeft: 1),
                unitOfWork,
                escrows,
                accepted,
                waiting
            )
            .HandleAsync(new(Expert, accepted.Id), default);

        Assert.Equal(ReviewCaseStatus.PendingExpertResponse, waiting.Status);
        Assert.Empty(escrows.Refunded);
    }

    [Fact]
    public async Task A_failed_refund_keeps_the_accept_and_leaves_the_request_to_the_expiry_job()
    {
        var accepted = Paid();
        var waiting = Paid();
        var unitOfWork = new FakeUnitOfWork();

        var response = await Handler(
                new FakeSlots(unitOfWork, freeLeft: 0),
                unitOfWork,
                new FakeEscrows(down: true),
                accepted,
                waiting
            )
            .HandleAsync(new(Expert, accepted.Id), default);

        Assert.Equal(ReviewCaseStatus.InReview, response.Status);
        // Still waiting, so the expiry job refunds it at the response deadline
        Assert.Equal(ReviewCaseStatus.PendingExpertResponse, waiting.Status);
    }

    private static ReviewCase Paid()
    {
        var reviewCase = ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(ExpertProfile, Expert),
                "Check my CIT return",
                null,
                TimeProvider.System.GetUtcNow()
            )
            .Case;
        reviewCase.ConfirmPayment(TimeProvider.System.GetUtcNow());
        return reviewCase;
    }

    private static AccpetReviewHandler Handler(
        FakeSlots slots,
        FakeUnitOfWork unitOfWork,
        FakeEscrows escrows,
        params ReviewCase[] cases
    )
    {
        var fakeCases = new FakeCases(cases);
        return new(
            fakeCases,
            slots,
            new WaitingRequestRefunds(
                fakeCases,
                escrows,
                new RecordedEvents(),
                unitOfWork,
                TimeProvider.System
            ),
            new RecordedEvents(),
            unitOfWork,
            TimeProvider.System
        );
    }

    private sealed class FakeSlots(FakeUnitOfWork unitOfWork, bool full = false, int freeLeft = 2)
        : IExpertSlots
    {
        public List<(Guid, Guid)> Taken { get; } = [];
        public bool TakenBeforeSave { get; private set; }

        public Task<int> TakeAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct)
        {
            if (full)
            {
                throw new AppException(ErrorType.Conflict, "EXPERT_FULL", "Full.");
            }
            TakenBeforeSave = !unitOfWork.Saved;
            Taken.Add((expertProfileId, reviewCaseId));
            return Task.FromResult(freeLeft);
        }

        public Task ReleaseAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();
    }

    private sealed class FakeEscrows(bool down = false) : IEscrows
    {
        public List<Guid> Refunded { get; } = [];

        public Task HoldAsync(Guid userId, Guid reviewCaseId, long amount, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task RefundAsync(Guid reviewCaseId, CancellationToken ct)
        {
            if (down)
            {
                throw WorkflowErrors.ServiceLinkUnavailable("billing");
            }
            Refunded.Add(reviewCaseId);
            return Task.CompletedTask;
        }

        public Task ReleaseAsync(
            Guid reviewCaseId,
            Guid expertUserId,
            ReviewSettlement settlement,
            CancellationToken ct
        ) => throw new NotSupportedException();
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

    private sealed class FakeCases(ReviewCase[] cases) : IReviewCaseRepository
    {
        public Task<ReviewCase?> FindForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult(cases.SingleOrDefault(x => x.Id == reviewCaseId));

        public Task<IReadOnlyList<Guid>> ListPendingIdsAsync(
            Guid expertUserId,
            string? serviceCode,
            CancellationToken ct
        ) =>
            Task.FromResult<IReadOnlyList<Guid>>(
                cases
                    .Where(x =>
                        x.ExpertUserId == expertUserId
                        && (serviceCode is null || x.ServiceCode == serviceCode)
                        && x.Status == ReviewCaseStatus.PendingExpertResponse
                    )
                    .Select(x => x.Id)
                    .ToList()
            );

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
