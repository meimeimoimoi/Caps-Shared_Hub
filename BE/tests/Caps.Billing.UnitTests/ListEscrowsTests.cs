using Caps.Billing.Application.Abstractions;
using Caps.Billing.Application.Features.Escrows;
using Caps.Billing.Domain;
using Caps.Common.Domain;

namespace Caps.Billing.UnitTests;

public sealed class ListEscrowsTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 6, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task The_status_filter_is_case_insensitive_and_the_page_is_returned()
    {
        var held = Escrow.Hold(Guid.NewGuid(), Guid.NewGuid(), 500_000, Now);
        var repo = new Escrows([held]);

        var page = await new ListEscrowsHandler(repo).HandleAsync(
            new(" held ", 2, 10),
            CancellationToken.None
        );

        Assert.Equal(EscrowStatus.Held, repo.Status);
        Assert.Equal(10, repo.Skip);
        Assert.Equal(1, page.Total);
        Assert.Equal(held.ReviewCaseId.ToString(), Assert.Single(page.Items).ReviewCaseId);
        Assert.Equal(Now, page.Items[0].CreatedAt);
    }

    [Fact]
    public async Task A_blank_status_lists_every_escrow()
    {
        var repo = new Escrows([]);

        await new ListEscrowsHandler(repo).HandleAsync(new(" ", 1, 20), CancellationToken.None);

        Assert.Null(repo.Status);
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(1, 0)]
    [InlineData(1, 101)]
    public async Task Invalid_paging_is_rejected(int page, int pageSize)
    {
        var e = await Assert.ThrowsAsync<AppException>(() =>
            new ListEscrowsHandler(new Escrows([])).HandleAsync(
                new(null, page, pageSize),
                CancellationToken.None
            )
        );

        Assert.Equal("INVALID_PAGING", e.Code);
    }

    private sealed class Escrows(IReadOnlyList<Escrow> items) : IEscrowRepository
    {
        public string? Status { get; private set; }
        public int Skip { get; private set; }

        public Task<IReadOnlyList<Escrow>> ListAsync(
            string? status,
            int skip,
            int take,
            CancellationToken ct
        )
        {
            Status = status;
            Skip = skip;
            return Task.FromResult(items);
        }

        public Task<int> CountAsync(string? status, CancellationToken ct) =>
            Task.FromResult(items.Count);

        public Task<Escrow?> LockByReviewCaseAsync(Guid reviewCaseId, CancellationToken ct) =>
            throw new NotSupportedException();

        public void Add(Escrow escrow) => throw new NotSupportedException();
    }
}
