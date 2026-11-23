using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Application.Features.Reviews;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;

namespace Caps.Expert.UnitTests;

public sealed class ReviewQueueSortingTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 19, 0, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(false, "Bella")]
    [InlineData(true, "Yankee")]
    public async Task Both_gates_are_merged_in_the_selected_order_before_paging(
        bool descending,
        string expected
    )
    {
        var reader = new Queue(descending);
        var handler = new SearchReviewQueueHandler(
            reader,
            new Catalog(),
            new Policies(),
            TimeProvider.System
        );
        var result = await handler.HandleAsync(
            new(
                ["SUBMITTED"],
                ["COMPETENCY_REVIEW"],
                null,
                2,
                1,
                Guid.NewGuid(),
                "ALL",
                "name",
                descending
            ),
            CancellationToken.None
        );

        Assert.Equal(expected, Assert.Single(result.Items).DisplayName);
        Assert.Equal(4, result.Total);
        Assert.Equal(2, reader.Take);
        Assert.Equal("name", reader.Scope!.SortBy);
        Assert.Equal(descending, reader.Scope.SortDescending);
    }

    [Theory]
    [InlineData(false, true)]
    [InlineData(true, false)]
    public async Task Waiting_days_reverse_the_submission_date_order(
        bool descending,
        bool expectedDateDescending
    )
    {
        var reader = new Queue(false);
        await new SearchReviewQueueHandler(
            reader,
            new Catalog(),
            new Policies(),
            TimeProvider.System
        ).HandleAsync(
            new(["SUBMITTED"], [], null, 1, 10, Guid.NewGuid(), "ALL", "WAITING", descending),
            CancellationToken.None
        );

        Assert.Equal("submittedAt", reader.Scope!.SortBy);
        Assert.Equal(expectedDateDescending, reader.Scope.SortDescending);
    }

    private static ReviewQueueRowResponse Row(string name, string gate) =>
        new(
            Guid.NewGuid().ToString(),
            gate,
            Guid.NewGuid().ToString(),
            name,
            5,
            [],
            null,
            null,
            "SUBMITTED",
            Now,
            false
        );

    // Each source returns its sorted prefix, as the database reader does.
    private sealed class Queue(bool descending) : IReviewQueueReader
    {
        public ReviewQueueScope? Scope { get; private set; }
        public int Take { get; private set; }

        private Task<IReadOnlyList<ReviewQueueRowResponse>> Prefix(
            string[] names,
            string gate,
            ReviewQueueScope scope,
            int take
        )
        {
            Scope = scope;
            Take = take;
            var ordered = descending ? names.Reverse() : names;
            return Task.FromResult<IReadOnlyList<ReviewQueueRowResponse>>(
                ordered.Take(take).Select(n => Row(n, gate)).ToArray()
            );
        }

        public Task<int> CountApplicationsAsync(
            IReadOnlyCollection<string> statuses,
            string? search,
            ReviewQueueScope scope,
            CancellationToken ct
        ) => Task.FromResult(2);

        public Task<int> CountQualificationsAsync(
            IReadOnlyCollection<string> statuses,
            string? search,
            IReadOnlyCollection<string> services,
            ReviewQueueScope scope,
            CancellationToken ct
        ) => Task.FromResult(2);

        public Task<IReadOnlyList<ReviewQueueRowResponse>> ListApplicationsAsync(
            IReadOnlyCollection<string> statuses,
            string? search,
            ReviewQueueScope scope,
            int take,
            CancellationToken ct
        ) => Prefix(["Adam", "Zebra"], "GATE_1", scope, take);

        public Task<IReadOnlyList<ReviewQueueRowResponse>> ListQualificationsAsync(
            IReadOnlyCollection<string> statuses,
            string? search,
            IReadOnlyCollection<string> services,
            ReviewQueueScope scope,
            int take,
            CancellationToken ct
        ) => Prefix(["Bella", "Yankee"], "GATE_2", scope, take);

        public Task<int> CountFinalApprovalsPassedBeforeAsync(
            DateTimeOffset passedBefore,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyDictionary<string, int>> CountApplicationsByStatusAsync(
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyDictionary<string, int>> CountQualificationsByStatusAsync(
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyDictionary<string, int>> CountApplicationsByStatusAsync(
            ReviewQueueScope scope,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<IReadOnlyDictionary<string, int>> CountQualificationsByStatusAsync(
            ReviewQueueScope scope,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }

    private sealed class Catalog : IServiceCatalogRepository
    {
        public Task<IReadOnlyList<ServiceCatalogItem>> ListActiveAsync(CancellationToken ct) =>
            Task.FromResult<IReadOnlyList<ServiceCatalogItem>>([]);

        public Task<ServiceCatalogItem?> FindAsync(string code, CancellationToken ct) =>
            throw new NotSupportedException();
    }

    private sealed class Policies : IExpertPolicyProvider
    {
        public Task<ReviewClaimPolicy> GetReviewClaimAsync(CancellationToken ct) =>
            Task.FromResult(new ReviewClaimPolicy(TimeSpan.FromHours(24)));

        public Task<ReviewWorkPolicy> GetReviewWorkAsync(CancellationToken ct) =>
            Task.FromResult(new ReviewWorkPolicy(3, 5));

        public Task<FinalApprovalPolicy> GetFinalApprovalAsync(CancellationToken ct) =>
            Task.FromResult(new FinalApprovalPolicy(5));

        public Task<EligibilityPolicy> GetEligibilityAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<CompetencyPolicy> GetCompetencyAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<PricingPolicy> GetPricingAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<ScreeningPolicy> GetScreeningAsync(CancellationToken ct) =>
            throw new NotSupportedException();
    }
}
