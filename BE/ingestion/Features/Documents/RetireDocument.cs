using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Caps.Ingestion.DTOs.Requests;
using ingestion.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>A Knowledge Admin stops the AI from using an indexed version.</summary>
public sealed record RetireDocumentCommand(Guid UserId, Guid DocumentId, string Reason);

/// <summary>
/// INDEXED → ARCHIVED through the lifecycle update, which also marks the vectors ARCHIVED in Qdrant; RAG only
/// retrieves APPROVED vectors, so the version is no longer used. The reason is kept in metadata.retire.
/// </summary>
public sealed class RetireDocumentHandler(
    IngestionDbContext db,
    IKnowledgeDocumentService documents,
    TimeProvider clock
) : ICommandHandler<RetireDocumentCommand>
{
    public async Task HandleAsync(RetireDocumentCommand command, CancellationToken ct)
    {
        var document =
            await db.KnowledgeDocuments.FirstOrDefaultAsync(x => x.Id == command.DocumentId, ct)
            ?? throw IngestionErrors.DocumentNotFound();
        if (document.Status != DocumentStatuses.Indexed)
            throw IngestionErrors.DocumentNotIndexed();

        // Same scoped DbContext as the lifecycle update, so the note commits with the status change
        document.Metadata = DocumentNotes.Add(
            document.Metadata,
            "retire",
            command.Reason.Trim(),
            command.UserId,
            clock.GetUtcNow()
        );
        await documents.UpdateMetadataAsync(
            document.Id,
            new UpdateDocumentMetadataRequest { Status = DocumentStatuses.Archived },
            ct
        );
    }
}
