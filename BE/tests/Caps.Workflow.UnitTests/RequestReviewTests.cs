using Caps.Common.Application;
using Caps.Common.Domain;
using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Application.Features.ReviewCases;
using Caps.Workflow.Domain.Review;

namespace Caps.Workflow.UnitTests;

public sealed class RequestReviewTests
{
    private static readonly Guid Client = Guid.NewGuid();
    private static readonly Guid ExpertProfile = Guid.NewGuid();
    private static readonly Guid Expert = Guid.NewGuid();

    [Fact]
    public async Task A_booking_opens_a_case_awaiting_payment()
    {
        var cases = new FakeCases();

        var response = await Handler(cases, new FakeUnitOfWork()).HandleAsync(Command(), default);

        Assert.Equal(ReviewCaseStatus.AwaitingPayment, response.Status);
        Assert.Single(cases.Added);
    }

    [Fact]
    public async Task A_second_open_booking_of_the_version_with_the_expert_is_a_conflict()
    {
        var e = await Assert.ThrowsAsync<AppException>(() =>
            Handler(new FakeCases(), new FakeUnitOfWork(duplicate: true))
                .HandleAsync(Command(), default)
        );

        Assert.Equal("REVIEW_CASE_ALREADY_OPEN", e.Code);
        Assert.Equal(ErrorType.Conflict, e.Type);
    }

    [Fact]
    public void Only_running_cases_block_a_new_booking()
    {
        Assert.Contains(ReviewCaseStatus.AwaitingPayment, ReviewCase.OpenStatuses);
        Assert.Contains(ReviewCaseStatus.AwaitingAcceptance, ReviewCase.OpenStatuses);
        Assert.DoesNotContain(ReviewCaseStatus.ExpertDeclined, ReviewCase.OpenStatuses);
        Assert.DoesNotContain(ReviewCaseStatus.CancelledUnpaid, ReviewCase.OpenStatuses);
        Assert.DoesNotContain(ReviewCaseStatus.Completed, ReviewCase.OpenStatuses);
    }

    private static RequestReviewCommand Command() =>
        new(
            Client,
            "client@caps.test",
            Guid.NewGuid(),
            Guid.NewGuid(),
            ExpertProfile,
            "HUMAN_VERIFICATION",
            "Check my CIT return",
            null
        );

    private static RequestReviewHandler Handler(FakeCases cases, FakeUnitOfWork unitOfWork) =>
        new(new FakeDocuments(), new FakeOfferings(), cases, unitOfWork, TimeProvider.System);

    private sealed class FakeDocuments : IDocumentRepository
    {
        public Task<bool> OwnsVersionAsync(
            Guid userId,
            Guid documentId,
            Guid versionId,
            CancellationToken ct
        ) => Task.FromResult(true);
    }

    private sealed class FakeOfferings : IExpertOfferings
    {
        public Task<ReviewOffer?> FindAsync(
            Guid expertProfileId,
            string serviceCode,
            CancellationToken ct
        ) => Task.FromResult<ReviewOffer?>(Offers.Sample(expertProfileId, Expert));
    }

    private sealed class FakeUnitOfWork(bool duplicate = false) : IUnitOfWork
    {
        public Task<ITransaction> BeginTransactionAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task SaveChangesAsync(CancellationToken ct) =>
            duplicate
                ? throw new UniqueConstraintException(new Exception("ux_review_case_open"))
                : Task.CompletedTask;
    }

    private sealed class FakeCases : IReviewCaseRepository
    {
        public List<ReviewCase> Added { get; } = [];

        public void Add(ReviewCase reviewCase) => Added.Add(reviewCase);

        public void AddHistory(ReviewStatusHistory history) { }

        public Task<ReviewCase?> FindForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<Guid>> ListPendingIdsAsync(
            Guid expertProfileId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<ReviewCase>> ListForUserAsync(
            Guid userId,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }
}
