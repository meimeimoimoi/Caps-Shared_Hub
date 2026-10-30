using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Disputes;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class DisputeHandlerTests
{
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Stranger = Guid.NewGuid();

    [Fact]
    public async Task Opening_a_dispute_stores_it_and_stops_auto_confirm()
    {
        var run = new Run(Delivered());

        var response = await new OpenDisputeHandler(
            run.Cases,
            run.Disputes,
            run.UnitOfWork,
            TimeProvider.System
        ).HandleAsync(new(Client, run.Case.Id, "SLA_BREACH", "Delivered late"), default);

        Assert.Equal(ReviewDispute.Open, response.Status);
        Assert.Single(run.Disputes.Added);
        Assert.Equal(ReviewCaseStatus.Disputed, run.Case.Status);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task Withdrawing_settles_as_a_confirm_before_saving()
    {
        var run = new Run(Delivered(), dispute: true);

        var response = await run.Withdraw(Client);

        Assert.Equal(ReviewCaseStatus.Completed, response.Status);
        Assert.Equal(new ReviewSettlement(0, 200_000, 800_000), run.Escrows.Settlement);
        Assert.True(run.Escrows.SettledBeforeSave);
        Assert.Equal([(ExpertProfile, run.Case.Id)], run.Slots.Released);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task A_billing_failure_keeps_the_dispute_open()
    {
        var run = new Run(Delivered(), dispute: true, billingDown: true);

        var e = await Assert.ThrowsAsync<AppException>(() => run.Withdraw(Client));

        Assert.Equal("SERVICE_LINK_UNAVAILABLE", e.Code);
        Assert.False(run.UnitOfWork.Saved);
        Assert.False(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task Only_the_client_withdraws()
    {
        var run = new Run(Delivered(), dispute: true);

        var e = await Assert.ThrowsAsync<AppException>(() => run.Withdraw(Expert));

        Assert.Equal("REVIEW_CASE_NOT_FOUND", e.Code);
        Assert.Null(run.Escrows.Settlement);
    }

    [Fact]
    public async Task The_expert_explains_and_a_stranger_cannot()
    {
        var run = new Run(Delivered(), dispute: true);
        var handler = new AddDisputeStatementHandler(
            run.Cases,
            run.Disputes,
            run.UnitOfWork,
            TimeProvider.System
        );

        var response = await handler.HandleAsync(
            new(Expert, run.Case.Id, "VAT was out of scope"),
            default
        );
        var e = await Assert.ThrowsAsync<AppException>(() =>
            handler.HandleAsync(new(Client, run.Case.Id, "Me too"), default)
        );

        Assert.Equal("VAT was out of scope", response.ExpertStatement);
        Assert.Equal("REVIEW_CASE_NOT_FOUND", e.Code);
    }

    [Fact]
    public async Task Both_parties_read_the_dispute_and_nobody_else()
    {
        var run = new Run(Delivered(), dispute: true);
        var handler = new GetDisputeHandler(run.Cases, run.Disputes);

        var seen = await handler.HandleAsync(new(Expert, run.Case.Id), default);
        var e = await Assert.ThrowsAsync<AppException>(() =>
            handler.HandleAsync(new(Stranger, run.Case.Id), default)
        );

        Assert.Equal("SLA_BREACH", seen.Reason);
        Assert.Equal("REVIEW_CASE_NOT_FOUND", e.Code);
    }

    [Fact]
    public async Task A_case_without_a_dispute_has_none_to_read()
    {
        var run = new Run(Delivered());

        var e = await Assert.ThrowsAsync<AppException>(() =>
            new GetDisputeHandler(run.Cases, run.Disputes).HandleAsync(
                new(Client, run.Case.Id),
                default
            )
        );

        Assert.Equal("DISPUTE_NOT_FOUND", e.Code);
    }

    private static ReviewCase Delivered()
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
        reviewCase.Deliver(ExpertProfile, Expert, ReviewCase.Verified, "All good", null, now);
        return reviewCase;
    }

    private sealed class Run
    {
        public Run(ReviewCase reviewCase, bool dispute = false, bool billingDown = false)
        {
            Case = reviewCase;
            Cases = new FakeCases(reviewCase);
            UnitOfWork = new FakeUnitOfWork();
            Escrows = new FakeEscrows(UnitOfWork, billingDown);
            Disputes = new FakeDisputes();
            if (dispute)
            {
                var (opened, _) = reviewCase.OpenDispute(
                    Client,
                    "SLA_BREACH",
                    "Delivered late",
                    TimeProvider.System.GetUtcNow()
                );
                Disputes.Add(opened);
                Disputes.Added.Clear();
            }
        }

        public ReviewCase Case { get; }
        public FakeCases Cases { get; }
        public FakeDisputes Disputes { get; }
        public FakeEscrows Escrows { get; }
        public FakeSlots Slots { get; } = new();
        public FakeUnitOfWork UnitOfWork { get; }

        public Task<ReviewCaseResponse> Withdraw(Guid userId) =>
            new WithdrawDisputeHandler(
                Cases,
                Disputes,
                Escrows,
                Slots,
                UnitOfWork,
                TimeProvider.System
            ).HandleAsync(new(userId, Case.Id), default);
    }

    private sealed class FakeDisputes : IReviewDisputeRepository
    {
        private readonly List<ReviewDispute> stored = [];
        public List<ReviewDispute> Added { get; } = [];

        public Task<ReviewDispute?> FindByCaseAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult(stored.SingleOrDefault(x => x.ReviewCaseId == reviewCaseId));

        public Task<IReadOnlyList<(ReviewDispute Dispute, ReviewCase Case)>> ListOpenAsync(
            CancellationToken ct
        ) => throw new NotSupportedException();

        public void Add(ReviewDispute dispute)
        {
            stored.Add(dispute);
            Added.Add(dispute);
        }
    }

    private sealed class FakeEscrows(FakeUnitOfWork unitOfWork, bool down) : IEscrows
    {
        public ReviewSettlement? Settlement { get; private set; }
        public bool SettledBeforeSave { get; private set; }

        public Task HoldAsync(Guid userId, Guid reviewCaseId, long amount, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task RefundAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task ReleaseAsync(
            Guid reviewCaseId,
            Guid expertUserId,
            ReviewSettlement settlement,
            CancellationToken ct
        )
        {
            if (down)
            {
                throw WorkflowErrors.ServiceLinkUnavailable("billing");
            }
            SettledBeforeSave = !unitOfWork.Saved;
            Settlement = settlement;
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
            FindForUpdateAsync(reviewCaseId, ct);

        public void AddHistory(ReviewStatusHistory history) { }

        public void Add(ReviewCase reviewCase) => throw new NotSupportedException();

        public Task<IReadOnlyList<ReviewCase>> ListForUserAsync(
            Guid userId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<Guid>> ListPendingIdsAsync(
            Guid expertProfileId,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }
}
