using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class RateReviewHandlerTests
{
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();

    [Fact]
    public async Task A_rating_counts_at_the_expert_and_is_saved()
    {
        var reviewCase = Completed();
        var ratings = new FakeRatings();
        var unitOfWork = new FakeUnitOfWork();

        var response = await new RateReviewHandler(
            new FakeCases(reviewCase),
            ratings,
            unitOfWork,
            TimeProvider.System
        ).HandleAsync(new(Client, reviewCase.Id, 5, "Great"), default);

        Assert.Equal((ExpertProfile, reviewCase.Id, (short)5), Assert.Single(ratings.Recorded));
        Assert.True(unitOfWork.Committed);
        Assert.Equal((short)5, response.Rating);
    }

    [Fact]
    public async Task An_unreachable_expert_service_saves_nothing()
    {
        var reviewCase = Completed();
        var unitOfWork = new FakeUnitOfWork();

        var e = await Assert.ThrowsAsync<AppException>(() =>
            new RateReviewHandler(
                new FakeCases(reviewCase),
                new FakeRatings(down: true),
                unitOfWork,
                TimeProvider.System
            ).HandleAsync(new(Client, reviewCase.Id, 5, null), default)
        );

        Assert.Equal("SERVICE_LINK_UNAVAILABLE", e.Code);
        Assert.False(unitOfWork.Committed);
    }

    private static ReviewCase Completed()
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
        reviewCase.Deliver(ExpertProfile, Expert, ReviewCase.Verified, "Done", null, now);
        reviewCase.Confirm(Client, now);
        return reviewCase;
    }

    private sealed class FakeRatings(bool down = false) : IExpertRatings
    {
        public List<(Guid, Guid, short)> Recorded { get; } = [];

        public Task RecordAsync(
            Guid expertProfileId,
            Guid reviewCaseId,
            short stars,
            CancellationToken ct
        )
        {
            if (down)
            {
                throw WorkflowErrors.ServiceLinkUnavailable("expert");
            }
            Recorded.Add((expertProfileId, reviewCaseId, stars));
            return Task.CompletedTask;
        }
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

        public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
            FindForUpdateAsync(reviewCaseId, ct);

        public void AddHistory(ReviewStatusHistory history) { }

        public void Add(ReviewCase reviewCase) => throw new NotSupportedException();

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
