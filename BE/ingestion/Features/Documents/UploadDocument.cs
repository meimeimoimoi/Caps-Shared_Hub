using System.Security.Cryptography;
using System.Text.Json;
using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Responses;
using Caps.Ingestion.Entities;
using Caps.Ingestion.Messaging;
using Caps.Ingestion.Storage;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>A Knowledge Admin uploads a legal document file with the metadata of its legal source.</summary>
public sealed record UploadDocumentCommand(
    Guid UserId,
    string FileName,
    byte[] Content,
    string DocumentNumber,
    string DocType,
    string? IssuingAuthority,
    string Title,
    DateOnly? IssuedDate,
    DateOnly? EffectiveFrom,
    DateOnly? EffectiveTo
);

/// <summary>
/// Stores the file as a new PENDING version of its legal source (created when the number is new) and asks the
/// crawler worker to split it into articles. The same file (by SHA-256) is accepted only once.
/// </summary>
public sealed class UploadDocumentHandler(
    IngestionDbContext db,
    IUnitOfWork unitOfWork,
    IObjectStorage storage,
    IPublishEndpoint publisher,
    TimeProvider clock
) : ICommandHandler<UploadDocumentCommand, DocumentSummaryResponse>
{
    public async Task<DocumentSummaryResponse> HandleAsync(
        UploadDocumentCommand command,
        CancellationToken ct
    )
    {
        // Reject a bad file before touching the database
        var contentType = DocumentFiles.Validate(command.Content);
        if (command.EffectiveFrom > command.EffectiveTo)
            throw IngestionErrors.InvalidEffectivePeriod();
        var fileHash = Convert.ToHexString(SHA256.HashData(command.Content)).ToLowerInvariant();

        await using var tx = await unitOfWork.BeginTransactionAsync(ct);
        var now = clock.GetUtcNow();
        var candidate = new LegalSource
        {
            DocumentNumber = command.DocumentNumber,
            DocType = command.DocType,
            IssuingAuthority = command.IssuingAuthority,
            Title = command.Title,
            CreatedAt = now,
        };
        var (source, version) = await LegalSourceVersions.ClaimNextAsync(db, candidate, ct);
        if (await db.KnowledgeDocuments.AnyAsync(x => x.FileHash == fileHash, ct))
            throw IngestionErrors.DocumentDuplicate();

        var document = new KnowledgeDocument
        {
            LegalSourceId = source.Id,
            VersionNo = version,
            Source = DocumentSources.ManualUpload,
            UploadedBy = command.UserId,
            FileHash = fileHash,
            IssuedDate = command.IssuedDate,
            EffectiveFrom = command.EffectiveFrom,
            EffectiveTo = command.EffectiveTo,
            Status = DocumentStatuses.Pending,
            Metadata = JsonSerializer.Serialize(
                new
                {
                    fileName = command.FileName,
                    contentType,
                    sizeBytes = command.Content.Length,
                }
            ),
            CreatedAt = now,
        };
        document.FileUrl = $"knowledge/{document.Id}";
        db.KnowledgeDocuments.Add(document);
        await storage.PutAsync(document.FileUrl, command.Content, contentType, ct);
        try
        {
            await unitOfWork.SaveChangesAsync(ct);
            // Published before commit like crawl requests; the worker retries while the row is not visible yet
            await publisher.Publish(new DocumentParseRequested(document.Id), ct);
            await tx.CommitAsync(ct);
        }
        catch (UniqueConstraintException)
        {
            // The same file was uploaded at the same moment under another document number
            await storage.DeleteQuietlyAsync(document.FileUrl);
            throw IngestionErrors.DocumentDuplicate();
        }
        catch
        {
            // The row was not saved, so the stored file would never be reachable
            await storage.DeleteQuietlyAsync(document.FileUrl);
            throw;
        }
        return DocumentSummaryResponse.From(document, source);
    }
}
