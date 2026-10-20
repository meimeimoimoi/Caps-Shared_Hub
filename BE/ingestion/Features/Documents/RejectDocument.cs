using Caps.Common.Application;
using Caps.Ingestion.Constants;
using Caps.Ingestion.Data;
using Microsoft.EntityFrameworkCore;

namespace Caps.Ingestion.Features.Documents;

/// <summary>A Knowledge Admin rejects a pending document with a reason.</summary>
public sealed record RejectDocumentCommand(Guid ReviewerUserId, Guid DocumentId, string Reason);

/// <summary>
/// PENDING → REJECTED in one conditional update, so two admins deciding at once cannot both win.
/// ApprovedBy/ApprovedAt record who decided and when, for a rejection too.
/// </summary>
public sealed class RejectDocumentHandler(IngestionDbContext db, TimeProvider clock)
    : ICommandHandler<RejectDocumentCommand>
{
    public async Task HandleAsync(RejectDocumentCommand command, CancellationToken ct)
    {
        var reason = command.Reason.Trim();
        if (reason.Length == 0)
            throw IngestionErrors.RejectionReasonRequired();
        var now = clock.GetUtcNow();
        var updated = await db
            .KnowledgeDocuments.Where(x =>
                x.Id == command.DocumentId && x.Status == DocumentStatuses.Pending
            )
            .ExecuteUpdateAsync(
                s =>
                    s.SetProperty(x => x.Status, DocumentStatuses.Rejected)
                        .SetProperty(x => x.RejectionReason, reason)
                        .SetProperty(x => x.ApprovedBy, command.ReviewerUserId)
                        .SetProperty(x => x.ApprovedAt, now),
                ct
            );
        if (updated == 0)
        {
            throw await db.KnowledgeDocuments.AnyAsync(x => x.Id == command.DocumentId, ct)
                ? IngestionErrors.DocumentNotPending()
                : IngestionErrors.DocumentNotFound();
        }
    }
}
