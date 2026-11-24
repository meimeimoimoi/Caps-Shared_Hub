using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.DTOs.Responses;
using Caps.Workflow.Application.Features.Disputes;
using Caps.Workflow.Domain;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class AdminDisputeHandlerTests
{
    private static readonly DateTimeOffset T0 = new(2026, 10, 30, 8, 0, 0, TimeSpan.Zero);
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();
    private static readonly Guid Admin = Guid.NewGuid();

    [Fact]
    public async Task The_decision_settles_by_the_admin_refund_before_saving()
    {
        var run = new Run();

        var response = await run.Resolve(50);

        Assert.Equal(ReviewDispute.Resolved, response.Status);
        Assert.Equal(ReviewCaseStatus.Resolved, run.Case.Status);
        Assert.Equal(Admin, run.Dispute.ResolvedBy);
        // Upheld: half back, the platform keeps the other half
        Assert.Equal(new ReviewSettlement(500_000, 500_000, 0), run.Escrows.Settlement);
        Assert.True(run.Escrows.SettledBeforeSave);
        Assert.Equal([(ExpertProfile, run.Case.Id)], run.Slots.Released);
        Assert.True(run.UnitOfWork.Committed);
    }

    [Fact]
    public async Task A_billing_failure_keeps_the_dispute_open()
    {
        var run = new Run(billingDown: true);

        var e = await Assert.ThrowsAsync<AppException>(() => run.Resolve(50));

        Assert.Equal("SERVICE_LINK_UNAVAILABLE", e.Code);
        Assert.False(run.UnitOfWork.Saved);
    }

    [Fact]
    public async Task The_admin_extends_once()
    {
        var run = new Run();
        var handler = new ExtendDisputeHandler(run.Disputes, run.UnitOfWork);

        var response = await handler.HandleAsync(new(run.Case.Id), default);
        var e = await Assert.ThrowsAsync<AppException>(() =>
            handler.HandleAsync(new(run.Case.Id), default)
        );

        // Opened Friday: due Tuesday, extended to Thursday
        Assert.Equal(T0.AddHours(1).AddDays(6), response.DecideBy);
        Assert.Equal("DISPUTE_ALREADY_EXTENDED", e.Code);
        Assert.True(run.UnitOfWork.Saved);
    }

    [Fact]
    public async Task Extending_a_case_without_a_dispute_is_not_found()
    {
        var run = new Run();

        var e = await Assert.ThrowsAsync<AppException>(() =>
            new ExtendDisputeHandler(run.Disputes, run.UnitOfWork).HandleAsync(
                new(Guid.NewGuid()),
                default
            )
        );

        Assert.Equal("DISPUTE_NOT_FOUND", e.Code);
    }

    [Fact]
    public async Task A_decided_dispute_leaves_the_queue_and_shows_among_the_closed()
    {
        var run = new Run();
        await run.Resolve(50);
        // Long past the decision window: a closed dispute is never flagged overdue
        var list = (bool closed) =>
            new ListOpenDisputesHandler(
                run.Disputes,
                new CaseDetailsTests.FakeSources(null),
                new Clock(T0.AddDays(30))
            ).HandleAsync(new(closed), default);

        Assert.Empty(await list(false));
        var item = Assert.Single(await list(true));
        Assert.Equal((ReviewDispute.Resolved, false), (item.Dispute.Status, item.Overdue));
    }

    // Opened Friday: 2 working days end on Tuesday, 96 hours later
    [Theory]
    [InlineData(95, false)]
    [InlineData(97, true)]
    public async Task The_queue_flags_disputes_past_their_decision_window(int hours, bool overdue)
    {
        var run = new Run();

        var queue = await new ListOpenDisputesHandler(
            run.Disputes,
            new CaseDetailsTests.FakeSources(null),
            new Clock(T0.AddHours(1 + hours))
        ).HandleAsync(new(), default);

        var item = Assert.Single(queue);
        Assert.Equal(run.Case.Id.ToString(), item.ReviewCaseId);
        // Who the parties are, for the admin only
        Assert.Equal(
            ("client@caps.test", ExpertProfile.ToString()),
            (item.RequesterEmail, item.ExpertProfileId)
        );
        Assert.Equal(1_000_000, item.Fee);
        Assert.Equal(overdue, item.Overdue);
        Assert.Equal("OBLIGATION_NOT_MET", item.Dispute.Reason);
    }

    // Delivered at T0, disputed at T0 + 1h
    private sealed class Run
    {
        public Run(bool billingDown = false)
        {
            Case = ReviewCase
                .Request(
                    Client,
                    "client@caps.test",
                    Guid.NewGuid(),
                    Guid.NewGuid(),
                    Offers.Sample(ExpertProfile, Expert),
                    "Check my CIT return",
                    null,
                    T0.AddHours(-2)
                )
                .Case;
            Case.ConfirmPayment(T0.AddHours(-2));
            Case.Accept(ExpertProfile, Expert, T0.AddHours(-1));
            Case.Deliver(
                ExpertProfile,
                Expert,
                ReviewCase.Verified,
                "All good",
                null,
                ["Article 9, CIT Law"],
                true,
                T0
            );
            (Dispute, _) = Case.OpenDispute(
                Client,
                "OBLIGATION_NOT_MET",
                "Delivered late",
                T0.AddHours(1)
            );
            // The admin decides at T0 + 5h, inside the statement window: the expert has explained by then
            Case.AddExpertStatement(Dispute, ExpertProfile, "All parts delivered", T0.AddHours(2));
            Disputes = new FakeDisputes(Case, Dispute);
            Escrows = new FakeEscrows(UnitOfWork, billingDown);
        }

        public ReviewCase Case { get; }
        public ReviewDispute Dispute { get; }
        public FakeDisputes Disputes { get; }
        public FakeEscrows Escrows { get; }
        public FakeSlots Slots { get; } = new();
        public FakeUnitOfWork UnitOfWork { get; } = new();

        public Task<DisputeResponse> Resolve(short pct) =>
            new ResolveDisputeHandler(
                new FakeCases(Case),
                Disputes,
                Escrows,
                Slots,
                new RecordedEvents(),
                UnitOfWork,
                new Clock(T0.AddHours(5))
            ).HandleAsync(new(Admin, Case.Id, pct, "Partly late"), default);
    }

    private sealed class Clock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }

    private sealed class FakeDisputes(ReviewCase reviewCase, ReviewDispute dispute)
        : IReviewDisputeRepository
    {
        public Task<ReviewDispute?> FindByCaseAsync(Guid reviewCaseId, CancellationToken ct) =>
            Task.FromResult(dispute.ReviewCaseId == reviewCaseId ? dispute : null);

        public Task<IReadOnlyList<(ReviewDispute Dispute, ReviewCase Case)>> ListAsync(
            bool open,
            CancellationToken ct
        ) =>
            Task.FromResult<IReadOnlyList<(ReviewDispute, ReviewCase)>>(
                (dispute.Status == ReviewDispute.Open) == open ? [(dispute, reviewCase)] : []
            );

        public void Add(ReviewDispute dispute) => throw new NotSupportedException();
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
            throw new NotSupportedException();

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
