using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class ExpireReviewCaseTests
{
    private static readonly DateTimeOffset T0 = new(2026, 10, 29, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();

    [Fact]
    public async Task An_unpaid_case_is_cancelled_without_touching_money()
    {
        var reviewCase = Booked();
        var run = new Run(reviewCase, T0.AddMinutes(16));

        await run.ExpireAsync();

        Assert.Equal(ReviewCaseStatus.CancelledUnpaid, reviewCase.Status);
        Assert.Empty(run.Escrows.Calls);
        Assert.Empty(run.Slots.Released);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task An_expert_who_never_answers_refunds_the_client()
    {
        var reviewCase = Paid();
        var run = new Run(reviewCase, T0.AddHours(25));

        await run.ExpireAsync();

        Assert.Equal(ReviewCaseStatus.ExpertTimeout, reviewCase.Status);
        Assert.Equal(["refund"], run.Escrows.Calls);
        Assert.True(run.Escrows.CalledBeforeSave);
        // No slot was taken before acceptance, so none is freed
        Assert.Empty(run.Slots.Released);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task An_expert_who_never_delivers_refunds_the_client_and_frees_the_slot()
    {
        var reviewCase = Accepted();
        // 48h turnaround + 72h cancel window
        var run = new Run(reviewCase, T0.AddHours(120));

        await run.ExpireAsync();

        Assert.Equal(ReviewCaseStatus.DeliveryOverdue, reviewCase.Status);
        Assert.Equal(["refund"], run.Escrows.Calls);
        Assert.Equal([(ExpertProfile, reviewCase.Id)], run.Slots.Released);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task A_late_delivery_inside_the_cancel_window_is_left_alone()
    {
        var reviewCase = Accepted();
        var run = new Run(reviewCase, T0.AddHours(119));

        await run.ExpireAsync();

        Assert.Equal(ReviewCaseStatus.InReview, reviewCase.Status);
        Assert.Empty(run.Escrows.Calls);
        Assert.False(run.UnitOfWork.Saved);
    }

    [Fact]
    public async Task An_unconfirmed_delivery_settles_with_the_frozen_platform_fee()
    {
        var reviewCase = Accepted();
        reviewCase.Deliver(ExpertProfile, Expert, ReviewCase.Verified, "Looks right", null, T0);
        var run = new Run(reviewCase, T0 + ReviewCase.AcceptanceWindow);

        await run.ExpireAsync();

        Assert.Equal(ReviewCaseStatus.AutoConfirmed, reviewCase.Status);
        Assert.Equal(["settle"], run.Escrows.Calls);
        Assert.Equal(new ReviewSettlement(0, 200_000, 800_000), run.Escrows.Settlement);
        Assert.Equal([(ExpertProfile, reviewCase.Id)], run.Slots.Released);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task A_silent_client_ends_the_case_with_the_no_response_split()
    {
        var reviewCase = Accepted();
        var (request, _) = reviewCase.RequestInformation(ExpertProfile, Expert, "Which year?", T0);
        var run = new Run(reviewCase, T0.AddHours(72), request);

        await run.ExpireAsync();

        Assert.Equal(ReviewCaseStatus.Terminated, reviewCase.Status);
        Assert.Equal(InfoRequest.Expired, request.Status);
        // 50% back to the client, 30% to the expert, the platform keeps 20%
        Assert.Equal(new ReviewSettlement(500_000, 200_000, 300_000), run.Escrows.Settlement);
        Assert.Equal([(ExpertProfile, reviewCase.Id)], run.Slots.Released);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task A_client_still_inside_the_answer_window_is_left_alone()
    {
        var reviewCase = Accepted();
        var (request, _) = reviewCase.RequestInformation(ExpertProfile, Expert, "Which year?", T0);
        var run = new Run(reviewCase, T0.AddHours(71), request);

        await run.ExpireAsync();

        Assert.Equal(ReviewCaseStatus.AwaitingUserInformation, reviewCase.Status);
        Assert.Empty(run.Escrows.Calls);
        Assert.False(run.UnitOfWork.Saved);
    }

    [Fact]
    public async Task A_billing_failure_saves_nothing_so_the_next_run_retries()
    {
        var reviewCase = Paid();
        var run = new Run(reviewCase, T0.AddHours(25), billingDown: true);

        var e = await Assert.ThrowsAsync<AppException>(run.ExpireAsync);

        Assert.Equal("SERVICE_LINK_UNAVAILABLE", e.Code);
        Assert.False(run.UnitOfWork.Saved);
        Assert.False(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task A_case_already_handled_is_left_alone()
    {
        var reviewCase = Paid();
        reviewCase.ExpireIfOverdue(T0.AddHours(25));
        var run = new Run(reviewCase, T0.AddHours(26));

        await run.ExpireAsync();

        Assert.Empty(run.Escrows.Calls);
        Assert.False(run.UnitOfWork.Saved);
    }

    private static ReviewCase Booked() =>
        ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(ExpertProfile, Expert),
                "Check my CIT return",
                null,
                T0
            )
            .Case;

    private static ReviewCase Paid()
    {
        var reviewCase = Booked();
        reviewCase.ConfirmPayment(T0);
        return reviewCase;
    }

    private static ReviewCase Accepted()
    {
        var reviewCase = Paid();
        reviewCase.Accept(ExpertProfile, Expert, T0);
        return reviewCase;
    }

    private sealed class Run(
        ReviewCase reviewCase,
        DateTimeOffset now,
        InfoRequest? openRequest = null,
        bool billingDown = false
    )
    {
        public FakeUnitOfWork UnitOfWork { get; } = new();
        public FakeSlots Slots { get; } = new();
        public FakeEscrows Escrows { get; private set; } = default!;

        public Task ExpireAsync()
        {
            Escrows = new FakeEscrows(UnitOfWork, billingDown);
            return new ExpireReviewCaseHandler(
                new FakeCases(reviewCase),
                new FakeInfoRequests(openRequest),
                Escrows,
                Slots,
                UnitOfWork,
                new Clock(now)
            ).HandleAsync(new(reviewCase.Id), default);
        }
    }

    private sealed class Clock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class FakeEscrows(FakeUnitOfWork unitOfWork, bool down) : IEscrows
    {
        public List<string> Calls { get; } = [];
        public ReviewSettlement? Settlement { get; private set; }
        public bool CalledBeforeSave { get; private set; }

        public Task HoldAsync(Guid userId, Guid reviewCaseId, long amount, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task RefundAsync(Guid reviewCaseId, CancellationToken ct) => Record("refund");

        public Task ReleaseAsync(
            Guid reviewCaseId,
            Guid expertUserId,
            ReviewSettlement settlement,
            CancellationToken ct
        )
        {
            Settlement = settlement;
            return Record("settle");
        }

        private Task Record(string call)
        {
            if (down)
            {
                throw WorkflowErrors.ServiceLinkUnavailable("billing");
            }
            CalledBeforeSave = !unitOfWork.Saved;
            Calls.Add(call);
            return Task.CompletedTask;
        }
    }

    private sealed class FakeSlots : IExpertSlots
    {
        public List<(Guid, Guid)> Released { get; } = [];

        public Task<int> TakeAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task ReleaseAsync(Guid expertProfileId, Guid reviewCaseId, CancellationToken ct)
        {
            Released.Add((expertProfileId, reviewCaseId));
            return Task.CompletedTask;
        }
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

    private sealed class FakeInfoRequests(InfoRequest? openRequest) : IInfoRequestRepository
    {
        public Task<InfoRequest?> FindOpenForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult(openRequest);

        public void Add(InfoRequest request) => throw new NotSupportedException();
    }
}
