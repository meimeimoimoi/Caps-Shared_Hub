using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Entities;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>One document a crawl job found, from the worker's export file (JSON columns as raw text).</summary>
/// <param name="SourceUrl">Page of the document on the crawled site; the original file is not stored.</param>
public sealed record ImportCrawledDocumentCommand(
    Guid CrawlJobId,
    string DocumentNumber,
    string DocType,
    string? IssuingAuthority,
    string Title,
    string SourceMetadata,
    string Source,
    string FileHash,
    string? SourceUrl,
    DateOnly? IssuedDate,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo,
    string ContentJson,
    string Metadata
);

/// <summary>
/// Adds the document as a new PENDING version of its legal source (created on first sight). Idempotent: a file
/// hash that is already stored is skipped, so the worker may resend after a failure.
/// </summary>
public sealed class ImportCrawledDocumentHandler(
    IngestionDbContext db,
    IUnitOfWork unitOfWork,
    TimeProvider clock
) : ICommandHandler<ImportCrawledDocumentCommand, ImportedDocumentResponse>
{
    private static readonly string[] CrawlSources =
    [
        DocumentSources.CrawlVbpl,
        DocumentSources.CrawlMof,
    ];

    public async Task<ImportedDocumentResponse> HandleAsync(
        ImportCrawledDocumentCommand command,
        CancellationToken ct
    )
    {
        if (!CrawlSources.Contains(command.Source))
            throw IngestionErrors.InvalidDocumentSource(command.Source);

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var job =
            await db.CrawlJobs.FirstOrDefaultAsync(x => x.Id == command.CrawlJobId, ct)
            ?? throw IngestionErrors.CrawlJobNotFound();
        if (job.Status != CrawlJobStatuses.Running)
            throw IngestionErrors.CrawlJobNotRunning();

        var now = clock.GetUtcNow();
        var candidate = new LegalSource
        {
            DocumentNumber = command.DocumentNumber,
            DocType = command.DocType,
            IssuingAuthority = command.IssuingAuthority,
            Title = command.Title,
            Metadata = command.SourceMetadata,
            CreatedAt = now,
        };
        var (source, version) = await LegalSourceVersions.ClaimNextAsync(db, candidate, ct);
        var existingId = await db
            .KnowledgeDocuments.Where(x => x.FileHash == command.FileHash)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(ct);
        if (existingId is { } id)
            return new(id, Imported: false);

        var document = new KnowledgeDocument
        {
            LegalSourceId = source.Id,
            VersionNo = version,
            Source = command.Source,
            CrawlJobId = job.Id,
            FileUrl = command.SourceUrl ?? "",
            FileHash = command.FileHash,
            ContentJson = command.ContentJson,
            IssuedDate = command.IssuedDate,
            EffectiveFrom = command.EffectiveFrom,
            EffectiveTo = command.EffectiveTo,
            Status = DocumentStatuses.Pending,
            Metadata = command.Metadata,
            CreatedAt = now,
        };
        db.KnowledgeDocuments.Add(document);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new(document.Id, Imported: true);
    }
}
