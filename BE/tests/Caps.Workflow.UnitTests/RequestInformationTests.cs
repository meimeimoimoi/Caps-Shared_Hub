using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class RequestInformationTests
{
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();

    [Fact]
    public async Task The_client_is_told_about_the_question_after_it_is_saved()
    {
        var reviewCase = InReview();
        var unitOfWork = new FakeUnitOfWork();
        var events = new FakeEvents(unitOfWork);
        var requests = new FakeInfoRequests();

        await new RequestInformationHandler(
            new FakeCases(reviewCase),
            requests,
            events,
            unitOfWork,
            TimeProvider.System
        ).HandleAsync(new(Expert, reviewCase.Id, "Which year?"), default);

        var (told, question) = Assert.Single(events.InfoRequested);
        Assert.Equal(reviewCase.Id, told.Id);
        Assert.Same(requests.Added, question);
        Assert.Equal("client@caps.test", told.RequesterEmail);
        Assert.True(events.CommittedFirst);
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
        public Task ResponseDueAsync(
            Guid reviewCaseId,
            Guid expertUserId,
            DateTimeOffset responseDeadline,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task StatusChangedAsync(
            ReviewCase reviewCase,
            ReviewStatusHistory history,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public List<(ReviewCase, InfoRequest)> InfoRequested { get; } = [];
        public bool CommittedFirst { get; private set; }

        public Task RequestedAsync(ReviewCase reviewCase, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task InfoRequestedAsync(
            ReviewCase reviewCase,
            InfoRequest request,
            CancellationToken ct
        )
        {
            CommittedFirst = unitOfWork.Committed;
            InfoRequested.Add((reviewCase, request));
            return Task.CompletedTask;
        }
    }

    private sealed class FakeInfoRequests : IInfoRequestRepository
    {
        public InfoRequest? Added { get; private set; }

        public void Add(InfoRequest request) => Added = request;

        public Task<InfoRequest?> FindOpenForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();
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
