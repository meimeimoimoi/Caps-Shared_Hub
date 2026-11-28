using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Features.Payouts;
using Caps.Billing.Domain;
using Caps.Common.Domain;

namespace Caps.Billing.UnitTests;

public sealed class ListPayoutsTests
{
    [Theory]
    [InlineData("amount", false, "amount")]
    [InlineData("amount", true, "amount")]
    [InlineData("createdAt", false, "createdAt")]
    [InlineData("unsupported", true, "due")]
    [InlineData(null, true, "due")]
    public async Task Sorting_is_applied_to_the_repository_before_paging(
        string? requested,
        bool descending,
        string expected
    )
    {
        var repository = new Payouts();
        var page = await new ListPayoutsHandler(repository, WorkCalendar.WeekendsOnly).HandleAsync(
            new(" pending ", 3, 10, requested, descending),
            CancellationToken.None
        );

        Assert.Equal("PENDING", repository.Filter!.Status);
        Assert.Equal(20, repository.Skip);
        Assert.Equal(10, repository.Take);
        Assert.Equal(expected, repository.SortBy);
        Assert.Equal(descending, repository.Descending);
        Assert.Equal(25, page.Total);
    }

    // Advisor 2026-11-28: staff filter payouts by status, expert, time and amount
    [Fact]
    public async Task Every_filter_reaches_the_repository()
    {
        var repository = new Payouts();
        var expert = Guid.NewGuid();
        var from = new DateTimeOffset(2026, 11, 1, 0, 0, 0, TimeSpan.FromHours(7));
        var to = from.AddMonths(1);

        await new ListPayoutsHandler(repository, WorkCalendar.WeekendsOnly).HandleAsync(
            new(null, 1, 20, null, true, expert, from, to, 100_000, 5_000_000),
            CancellationToken.None
        );

        Assert.Equal(
            new PayoutFilter(null, expert, from, to, 100_000, 5_000_000),
            repository.Filter
        );
        // Npgsql refuses a non-UTC offset for timestamptz, so the handler converts the Vietnam days
        Assert.Equal(TimeSpan.Zero, repository.Filter!.From!.Value.Offset);
        Assert.Equal(TimeSpan.Zero, repository.Filter.To!.Value.Offset);
    }

    private sealed class Payouts : IPayoutRepository
    {
        public PayoutFilter? Filter { get; private set; }
        public int Skip { get; private set; }
        public int Take { get; private set; }
        public string? SortBy { get; private set; }
        public bool Descending { get; private set; }

        public Task<IReadOnlyList<PayoutTransaction>> ListAsync(
            PayoutFilter filter,
            int skip,
            int take,
            CancellationToken ct,
            string sortBy = "due",
            bool descending = true
        )
        {
            Filter = filter;
            Skip = skip;
            Take = take;
            SortBy = sortBy;
            Descending = descending;
            return Task.FromResult<IReadOnlyList<PayoutTransaction>>([]);
        }

        public Task<IReadOnlyList<PayoutTransaction>> ListUnsentAsync(CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<PayoutTransaction>> ListUnsentForAsync(
            Guid recipientUserId,
            CancellationToken ct
        ) => throw new NotSupportedException();

        public Task<int> CountAsync(PayoutFilter filter, CancellationToken ct) =>
            Task.FromResult(25);

        public Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<PayoutTransaction?> GetAsync(Guid id, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<bool> ProviderRefExistsAsync(string providerRef, CancellationToken ct) =>
            throw new NotSupportedException();

        public Task<IReadOnlyList<PayoutTransaction>> ListPaidAsync(
            DateTimeOffset from,
            DateTimeOffset to,
            CancellationToken ct
        ) => throw new NotSupportedException();
    }
}
