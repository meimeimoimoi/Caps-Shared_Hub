using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class WithdrawReviewTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 1, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();

    [Fact]
    public void An_unpaid_request_is_simply_cancelled()
    {
        var reviewCase = Booked();

        var history = reviewCase.Withdraw(Client, Now);

        // The expert never saw it, so it ends like an unpaid case that expired
        Assert.Equal(ReviewCaseStatus.CancelledUnpaid, reviewCase.Status);
        Assert.Equal(ReviewCase.ClientWithdrew, history.Note);
        Assert.Null(reviewCase.Outcome());
    }

    [Fact]
    public void A_paid_request_is_withdrawn_and_shows_a_full_refund()
    {
        var reviewCase = Paid();

        reviewCase.Withdraw(Client, Now);

        Assert.Equal(ReviewCaseStatus.Withdrawn, reviewCase.Status);
        Assert.Equal(new ReviewSettlement(1_000_000, 0, 0), reviewCase.Outcome());
    }

    [Fact]
    public void An_accepted_case_cannot_be_withdrawn()
    {
        var reviewCase = Paid();
        reviewCase.Accept(ExpertProfile, Expert, Now);

        Assert.Equal("CASE_STATUS_INVALID", Errors.CodeOf(() => reviewCase.Withdraw(Client, Now)));
    }

    [Fact]
    public void Only_the_client_withdraws() =>
        Assert.Equal("REVIEW_CASE_NOT_FOUND", Errors.CodeOf(() => Paid().Withdraw(Expert, Now)));

    [Fact]
    public async Task Withdrawing_a_paid_request_refunds_before_saving_and_tells_the_expert()
    {
        var run = new Run(Paid());

        var response = await run.Withdraw();

        Assert.Equal(ReviewCaseStatus.Withdrawn, response.Status);
        Assert.Equal([run.Case.Id], run.Escrows.Refunded);
        Assert.True(run.Escrows.RefundedBeforeSave);
        Assert.Equal([ReviewCaseStatus.Withdrawn], run.Events.StatusChanges);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task Withdrawing_an_unpaid_request_touches_no_money()
    {
        var run = new Run(Booked());

        await run.Withdraw();

        Assert.Empty(run.Escrows.Refunded);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task A_failed_refund_keeps_the_request_waiting()
    {
        var run = new Run(Paid(), billingDown: true);

        var e = await Assert.ThrowsAsync<AppException>(run.Withdraw);

        Assert.Equal("SERVICE_LINK_UNAVAILABLE", e.Code);
        Assert.False(run.UnitOfWork.Committed);
        Assert.Empty(run.Events.StatusChanges);
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
                Now.AddMinutes(-5)
            )
            .Case;

    private static ReviewCase Paid()
    {
        var reviewCase = Booked();
        reviewCase.ConfirmPayment(Now.AddMinutes(-4));
        return reviewCase;
    }

    private sealed class Run(ReviewCase reviewCase, bool billingDown = false)
    {
        public ReviewCase Case { get; } = reviewCase;
        public FakeUnitOfWork UnitOfWork { get; } = new();
        public RecordedEvents Events { get; } = new();
        public FakeEscrows Escrows { get; private set; } = default!;

        public Task<Caps.Workflow.Application.DTOs.Responses.ReviewCaseResponse> Withdraw()
        {
            Escrows = new FakeEscrows(UnitOfWork, billingDown);
            return new WithdrawReviewHandler(
                new FakeCases(Case),
                Escrows,
                Events,
                UnitOfWork,
                TimeProvider.System
            ).HandleAsync(new(Client, Case.Id), default);
        }
    }

    private sealed class FakeEscrows(FakeUnitOfWork unitOfWork, bool down) : IEscrows
    {
        public List<Guid> Refunded { get; } = [];
        public bool RefundedBeforeSave { get; private set; }

        public Task RefundAsync(Guid reviewCaseId, CancellationToken ct)
        {
            if (down)
            {
                throw WorkflowErrors.ServiceLinkUnavailable("billing");
            }
            RefundedBeforeSave = !unitOfWork.Saved;
            Refunded.Add(reviewCaseId);
            return Task.CompletedTask;
        }

        public Task HoldAsync(Guid userId, Guid reviewCaseId, long amount, CancellationToken ct) =>
            throw new NotSupportedException();

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
