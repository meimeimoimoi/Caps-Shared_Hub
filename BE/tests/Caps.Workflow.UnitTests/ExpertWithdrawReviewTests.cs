using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class ExpertWithdrawReviewTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Client = Guid.NewGuid();

    [Fact]
    public void An_accepted_case_ends_declined_with_a_full_refund()
    {
        var reviewCase = Accepted();

        var history = reviewCase.WithdrawAccepted(
            ExpertProfile,
            Expert,
            "Conflict of interest",
            Now
        );

        Assert.Equal(ReviewCaseStatus.ExpertDeclined, reviewCase.Status);
        Assert.Equal(ReviewCase.ExpertWithdrew, history.Note);
        Assert.Equal("Conflict of interest", reviewCase.DeclineReason);
        Assert.Equal(new ReviewSettlement(1_000_000, 0, 0), reviewCase.Outcome());
    }

    [Fact]
    public void The_expert_can_also_withdraw_while_waiting_for_the_client()
    {
        var reviewCase = Accepted();
        reviewCase.RequestInformation(ExpertProfile, Expert, "Send the ledger", Now);

        reviewCase.WithdrawAccepted(ExpertProfile, Expert, "Taken ill", Now.AddHours(1));

        Assert.Equal(ReviewCaseStatus.ExpertDeclined, reviewCase.Status);
    }

    [Fact]
    public void Withdrawing_needs_a_reason() =>
        Assert.Equal(
            "TEXT_REQUIRED",
            Errors.CodeOf(() => Accepted().WithdrawAccepted(ExpertProfile, Expert, " ", Now))
        );

    [Fact]
    public void A_waiting_request_is_declined_not_withdrawn() =>
        Assert.Equal(
            "CASE_STATUS_INVALID",
            Errors.CodeOf(() => Paid().WithdrawAccepted(ExpertProfile, Expert, "Busy", Now))
        );

    [Fact]
    public void A_delivered_case_cannot_be_withdrawn()
    {
        var reviewCase = Accepted();
        reviewCase.Deliver(ExpertProfile, Expert, ReviewCase.Verified, "All good", null, Now);

        Assert.Equal(
            "CASE_STATUS_INVALID",
            Errors.CodeOf(() => reviewCase.WithdrawAccepted(ExpertProfile, Expert, "Busy", Now))
        );
    }

    [Fact]
    public async Task Withdrawing_refunds_and_frees_the_slot_before_saving()
    {
        var run = new Run(Accepted());

        var response = await run.Withdraw(Expert);

        Assert.Equal(ReviewCaseStatus.ExpertDeclined, response.Status);
        Assert.Equal([run.Case.Id], run.Escrows.Refunded);
        Assert.True(run.Escrows.RefundedBeforeSave);
        Assert.Equal([(ExpertProfile, run.Case.Id)], run.Slots.Released);
        Assert.Equal([ReviewCaseStatus.ExpertDeclined], run.Events.StatusChanges);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task Another_user_gets_not_found()
    {
        var run = new Run(Accepted());

        var e = await Assert.ThrowsAsync<AppException>(() => run.Withdraw(Client));

        Assert.Equal("REVIEW_CASE_NOT_FOUND", e.Code);
        Assert.Empty(run.Escrows.Refunded);
    }

    [Fact]
    public async Task A_failed_refund_keeps_the_case_running()
    {
        var run = new Run(Accepted(), billingDown: true);

        var e = await Assert.ThrowsAsync<AppException>(() => run.Withdraw(Expert));

        Assert.Equal("SERVICE_LINK_UNAVAILABLE", e.Code);
        Assert.Empty(run.Slots.Released);
        Assert.False(run.UnitOfWork.Committed);
        Assert.Empty(run.Events.StatusChanges);
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
                Now.AddHours(-3)
            )
            .Case;
        reviewCase.ConfirmPayment(Now.AddHours(-3));
        return reviewCase;
    }

    private static ReviewCase Accepted()
    {
        var reviewCase = Paid();
        reviewCase.Accept(ExpertProfile, Expert, Now.AddHours(-2));
        return reviewCase;
    }

    private sealed class Run(ReviewCase reviewCase, bool billingDown = false)
    {
        public ReviewCase Case { get; } = reviewCase;
        public FakeUnitOfWork UnitOfWork { get; } = new();
        public RecordedEvents Events { get; } = new();
        public FakeSlots Slots { get; } = new();
        public FakeEscrows Escrows { get; private set; } = default!;

        public Task<Caps.Workflow.Application.DTOs.Responses.ReviewCaseResponse> Withdraw(
            Guid userId
        )
        {
            Escrows = new FakeEscrows(UnitOfWork, billingDown);
            return new ExpertWithdrawReviewHandler(
                new FakeCases(Case),
                Escrows,
                Slots,
                Events,
                UnitOfWork,
                TimeProvider.System
            ).HandleAsync(new(userId, Case.Id, "Conflict of interest"), default);
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
