using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>The worker's result for an uploaded file: the parsed content, or why it could not be split.</summary>
public sealed record SaveParsedContentCommand(Guid DocumentId, string? ContentJson, string? Error);

/// <summary>
/// Stores the parsed content of a PENDING document (clearing an earlier error) or records the error.
/// A decided document keeps the content its reviewer saw.
/// </summary>
public sealed class SaveParsedContentHandler(IngestionDbContext db, IUnitOfWork unitOfWork)
    : ICommandHandler<SaveParsedContentCommand>
{
    public async Task HandleAsync(SaveParsedContentCommand command, CancellationToken ct)
    {
        if ((command.ContentJson is null) == (command.Error is null))
            throw IngestionErrors.InvalidParseResult();
        var document =
            await db.KnowledgeDocuments.FirstOrDefaultAsync(x => x.Id == command.DocumentId, ct)
            ?? throw IngestionErrors.DocumentNotFound();
        if (document.Status != DocumentStatuses.Pending)
            throw IngestionErrors.DocumentNotPending();
        if (command.ContentJson != null)
            document.ContentJson = command.ContentJson;
        document.LastError = command.Error;
        await unitOfWork.SaveChangesAsync(ct);
    }
}
