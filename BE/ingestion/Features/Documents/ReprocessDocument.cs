using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.Messaging;
using MassTransit;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>A Knowledge Admin sends a pending upload back to the crawler worker to be split again.</summary>
public sealed record ReprocessDocumentCommand(Guid UserId, Guid DocumentId, string Reason);

/// <summary>
/// Clears the parsed content of a PENDING upload and asks the worker to parse the stored file again; the version
/// stays PENDING, so it comes back to review. Crawled originals are not stored, so only uploads qualify.
/// </summary>
public sealed class ReprocessDocumentHandler(
    IngestionDbContext db,
    IUnitOfWork unitOfWork,
    IPublishEndpoint publisher,
    TimeProvider clock
) : ICommandHandler<ReprocessDocumentCommand>
{
    public async Task HandleAsync(ReprocessDocumentCommand command, CancellationToken ct)
    {
        var document =
            await db.KnowledgeDocuments.FirstOrDefaultAsync(x => x.Id == command.DocumentId, ct)
            ?? throw IngestionErrors.DocumentNotFound();
        if (document.Status != DocumentStatuses.Pending)
            throw IngestionErrors.DocumentNotPending();
        if (document.Source != DocumentSources.ManualUpload)
            throw IngestionErrors.ReprocessUploadOnly();

        document.ContentJson = null;
        document.LastError = null;
        document.Metadata = DocumentNotes.Add(
            document.Metadata,
            "reprocess",
            command.Reason.Trim(),
            command.UserId,
            clock.GetUtcNow()
        );
        // Saved first: the worker's result must not land before the content is cleared
        await unitOfWork.SaveChangesAsync(ct);
        await publisher.Publish(new DocumentParseRequested(document.Id), ct);
    }
}
