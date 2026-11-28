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
    [InlineData("unsupported", true, "createdAt")]
    [InlineData(null, true, "createdAt")]
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

        Assert.Equal("PENDING", repository.Status);
        Assert.Equal(20, repository.Skip);
        Assert.Equal(10, repository.Take);
        Assert.Equal(expected, repository.SortBy);
        Assert.Equal(descending, repository.Descending);
        Assert.Equal(25, page.Total);
    }

    private sealed class Payouts : IPayoutRepository
    {
        public string? Status { get; private set; }
        public int Skip { get; private set; }
        public int Take { get; private set; }
        public string? SortBy { get; private set; }
        public bool Descending { get; private set; }

        public Task<IReadOnlyList<PayoutTransaction>> ListAsync(
            string? status,
            int skip,
            int take,
            CancellationToken ct,
            string sortBy = "createdAt",
            bool descending = true
        )
        {
            Status = status;
            Skip = skip;
            Take = take;
            SortBy = sortBy;
            Descending = descending;
            return Task.FromResult<IReadOnlyList<PayoutTransaction>>([]);
        }

        public Task<int> CountAsync(string? status, CancellationToken ct) => Task.FromResult(25);

        public Task<PayoutTransaction?> LockAsync(Guid id, CancellationToken ct) =>
            throw new NotSupportedException();
    }
}
