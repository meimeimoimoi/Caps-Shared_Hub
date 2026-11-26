using Caps.Common.Domain;
using Caps.Ingestion.Data;
using Caps.Ingestion.Features.Documents;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.UnitTests;

public sealed class ListDocumentsTests
{
    // Never opened: validation runs before any query
    private static IngestionDbContext Db() =>
        new(
            new DbContextOptionsBuilder<IngestionDbContext>()
                .UseNpgsql("Host=unused;Database=unused")
                .Options
        );

    [Fact]
    public async Task Unknown_status_is_rejected_before_querying()
    {
        var handler = new ListDocumentsHandler(Db());

        var error = await Assert.ThrowsAsync<AppException>(() =>
            handler.HandleAsync(new(["INDEX_FAILED", "BROKEN"], 1, 20), CancellationToken.None)
        );

        Assert.Equal("INVALID_DOCUMENT_STATUS", error.Code);
    }

    [Fact]
    public async Task Invalid_paging_is_rejected()
    {
        var handler = new ListDocumentsHandler(Db());

        var error = await Assert.ThrowsAsync<AppException>(() =>
            handler.HandleAsync(new([], 1, 101), CancellationToken.None)
        );

        Assert.Equal("INVALID_PAGING", error.Code);
    }
}
