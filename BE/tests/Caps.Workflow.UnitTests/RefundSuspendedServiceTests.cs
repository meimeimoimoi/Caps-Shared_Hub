using Caps.Common.Application;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Common;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class RefundSuspendedServiceTests
{
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();

    [Fact]
    public async Task Suspending_a_service_refunds_only_its_waiting_requests()
    {
        var waiting = Paid("HUMAN_VERIFICATION");
        var otherService = Paid("CIT_REVIEW");
        var running = Paid("HUMAN_VERIFICATION");
        running.Accept(ExpertProfile, Expert, TimeProvider.System.GetUtcNow());
        var escrows = new FakeEscrows();

        await Handler(escrows, waiting, otherService, running)
            .HandleAsync(new(Expert, "HUMAN_VERIFICATION"), default);

        Assert.Equal([waiting.Id], escrows.Refunded);
        Assert.Equal(ReviewCaseStatus.ExpertDeclined, waiting.Status);
        Assert.Equal(ReviewCase.ServiceSuspended, waiting.DeclineReason);
        Assert.Equal(ReviewCaseStatus.PendingExpertResponse, otherService.Status);
        // Accepted cases finish under the suspension
        Assert.Equal(ReviewCaseStatus.InReview, running.Status);
    }

    [Fact]
    public async Task Another_experts_requests_are_untouched()
    {
        var waiting = Paid("HUMAN_VERIFICATION");
        var escrows = new FakeEscrows();

        await Handler(escrows, waiting)
            .HandleAsync(new(Guid.NewGuid(), "HUMAN_VERIFICATION"), default);

        Assert.Empty(escrows.Refunded);
        Assert.Equal(ReviewCaseStatus.PendingExpertResponse, waiting.Status);
    }

    private static RefundSuspendedServiceHandler Handler(
        FakeEscrows escrows,
        params ReviewCase[] cases
    )
    {
        var fakeCases = new FakeCases(cases);
        var unitOfWork = new FakeUnitOfWork();
        return new(
            fakeCases,
            new WaitingRequestRefunds(fakeCases, escrows, unitOfWork, TimeProvider.System)
        );
    }

    private static ReviewCase Paid(string serviceCode)
    {
        var now = TimeProvider.System.GetUtcNow();
        var reviewCase = ReviewCase
            .Request(
                Client,
                "client@caps.test",
                Guid.NewGuid(),
                Guid.NewGuid(),
                Offers.Sample(ExpertProfile, Expert, serviceCode: serviceCode),
                "Check my CIT return",
                null,
                now
            )
            .Case;
        reviewCase.ConfirmPayment(now);
        return reviewCase;
    }

    private sealed class FakeEscrows : IEscrows
    {
        public List<Guid> Refunded { get; } = [];

        public Task HoldAsync(Guid userId, Guid reviewCaseId, long amount, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task RefundAsync(Guid reviewCaseId, CancellationToken ct)
        {
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
        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            Task.FromResult<ITransaction>(this);

        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

        public Task CommitAsync(CancellationToken ct) => Task.CompletedTask;

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

        public void AddHistory(ReviewStatusHistory history) { }

        public void Add(ReviewCase reviewCase) => throw new NotSupportedException();

        public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<ReviewCase>> ListForUserAsync(
            Guid userId,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }
}
