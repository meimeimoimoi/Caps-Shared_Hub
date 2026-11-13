using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Entities;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>One document a crawl job found, from the worker's export file (JSON columns as raw text).</summary>
/// <param name="SourceUrl">Page of the document on the crawled site; the original file is not stored.</param>
/// <param name="Amendment">Amendment between this document and the one the crawler reached it from, if any.</param>
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
    string Metadata,
    CrawledAmendment? Amendment
);

/// <summary>An amendment link between the imported document and another legal source, found by its number.</summary>
/// <param name="RelationType">AMENDS or REPLACES.</param>
/// <param name="AmendsOther">True when the imported document amends the other one, false when it is amended by it.</param>
public sealed record CrawledAmendment(
    string OtherDocumentNumber,
    string RelationType,
    bool AmendsOther
);

/// <summary>
/// Adds the document as a new PENDING version of its legal source (created on first sight) and records its
/// amendment link. Idempotent: a file hash that is already stored is skipped (only a new link is saved), so the
/// worker may resend after a failure.
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
        {
            // A document crawled before may come back through a relation; a source created here stays unsaved
            if (source != candidate && await LinkAsync(source, command.Amendment, now, ct))
            {
                await unitOfWork.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            return new(id, Imported: false);
        }

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
        await LinkAsync(source, command.Amendment, now, ct);
        await unitOfWork.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return new(document.Id, Imported: true);
    }

    /// <summary>Adds the amendment link; false when there is none, it is already stored or the other source is unknown.</summary>
    private async Task<bool> LinkAsync(
        LegalSource source,
        CrawledAmendment? amendment,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        if (amendment is null)
            return false;
        // shortcut: the other source must be imported first (the worker posts documents reached through a
        // relation last); a link to a source imported later is lost, look for it then if other clients appear
        var other = await db.LegalSources.FirstOrDefaultAsync(
            x => x.DocumentNumber == amendment.OtherDocumentNumber,
            ct
        );
        if (other is null || other.Id == source.Id)
            return false;
        var (amending, amended) = amendment.AmendsOther ? (source, other) : (other, source);
        var linked = await db.LegalAmendments.AnyAsync(
            x => x.AmendingSourceId == amending.Id && x.AmendedSourceId == amended.Id,
            ct
        );
        if (linked)
            return false;
        db.LegalAmendments.Add(
            new LegalAmendment
            {
                AmendingSource = amending,
                AmendedSource = amended,
                RelationType = amendment.RelationType,
                CreatedAt = now,
            }
        );
        return true;
    }
}
