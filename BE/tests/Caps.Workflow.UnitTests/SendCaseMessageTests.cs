using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.CaseChat;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class SendCaseMessageTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 20, 1, 0, 0, TimeSpan.Zero);
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();

    [Fact]
    public async Task A_saved_message_is_pushed_to_both_parties()
    {
        var reviewCase = InReview();
        var (handler, notifier, unitOfWork) = Handler(reviewCase);

        var sent = await handler.HandleAsync(new(Client, reviewCase.Id, " Hi "), default);

        var push = Assert.Single(notifier.Pushes);
        Assert.Equal(reviewCase.Id, push.ReviewCaseId);
        Assert.Equal([Client, Expert], push.Recipients);
        Assert.Equal(sent, push.Message);
        Assert.Equal("Hi", push.Message.Content);
        Assert.True(unitOfWork.SavedBeforePush);
    }

    [Fact]
    public async Task A_rejected_message_is_not_pushed()
    {
        var reviewCase = Completed();
        var (handler, notifier, _) = Handler(reviewCase);

        await Assert.ThrowsAsync<Caps.Common.Domain.AppException>(() =>
            handler.HandleAsync(new(Client, reviewCase.Id, "Hi"), default)
        );

        Assert.Empty(notifier.Pushes);
    }

    // Built through the real domain steps: requested, paid and accepted, so the chat is open
    private static ReviewCase InReview()
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
                Now
            )
            .Case;
        reviewCase.ConfirmPayment(Now);
        reviewCase.Accept(ExpertProfile, Expert, Now);
        return reviewCase;
    }

    // Delivered and confirmed by the client: the chat is closed
    private static ReviewCase Completed()
    {
        var reviewCase = InReview();
        reviewCase.Deliver(ExpertProfile, Expert, ReviewCase.Verified, "Looks right", null, Now);
        reviewCase.Confirm(Client, Now);
        return reviewCase;
    }

    private static (SendCaseMessageHandler, FakeNotifier, FakeUnitOfWork) Handler(
        ReviewCase reviewCase
    )
    {
        var notifier = new FakeNotifier();
        var unitOfWork = new FakeUnitOfWork(notifier);
        var handler = new SendCaseMessageHandler(
            new FakeCases(reviewCase),
            new FakeMessages(),
            unitOfWork,
            TimeProvider.System,
            notifier
        );
        return (handler, notifier, unitOfWork);
    }

    private sealed record Push(Guid ReviewCaseId, Guid[] Recipients, CaseMessageResponse Message);

    private sealed class FakeNotifier : ICaseChatNotifier
    {
        public List<Push> Pushes { get; } = [];

        public Task MessageCreatedAsync(
            Guid reviewCaseId,
            IReadOnlyCollection<Guid> recipientUserIds,
            CaseMessageResponse message,
            CancellationToken ct
        )
        {
            Pushes.Add(new(reviewCaseId, [.. recipientUserIds], message));
            return Task.CompletedTask;
        }
    }

    private sealed class FakeUnitOfWork(FakeNotifier notifier) : IUnitOfWork
    {
        public bool SavedBeforePush { get; private set; }

        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task SaveChangesAsync(CancellationToken ct)
        {
            SavedBeforePush = notifier.Pushes.Count == 0;
            return Task.CompletedTask;
        }
    }

    private sealed class FakeCases(ReviewCase reviewCase) : IReviewCaseRepository
    {
        public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult<ReviewCase?>(reviewCase.Id == reviewCaseId ? reviewCase : null);

        public Task<ReviewCase?> FindForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
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

        public void AddHistory(ReviewStatusHistory history) => throw new NotSupportedException();
    }

    private sealed class FakeMessages : ICaseMessageRepository
    {
        public Task<CaseMessage?> FindAsync(
            Guid reviewCaseId,
            Guid messageId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<CaseMessage>> ListAsync(
            Guid reviewCaseId,
            DateTimeOffset? before,
            DateTimeOffset? after,
            int limit,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyDictionary<Guid, int>> CountUnreadAsync(
            Guid userId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public void Add(CaseMessage message) { }
    }
}
