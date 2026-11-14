using Caps.Workflow.Domain.Review;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence;

/// <summary>Keeps each document in step with its review cases, inside the same save as the case's status change.</summary>
internal static class CaseDocuments
{
    // Paid and still running: these keep the document IN_REVIEW
    private static readonly string[] PaidOpen = ReviewCase
        .OpenStatuses.Where(s => s != ReviewCaseStatus.AwaitingPayment)
        .ToArray();

    public static async Task SyncAsync(WorkflowDbContext db, CancellationToken ct)
    {
        var moves = db
            .ChangeTracker.Entries<ReviewStatusHistory>()
            .Where(e => e.State == EntityState.Added)
            .Select(e => e.Entity)
            .ToList();
        foreach (var move in moves)
        {
            var reviewCase = await db.ReviewCases.FindAsync([move.ReviewCaseId], ct);
            if (
                reviewCase is null
                || (
                    move.FromStatus == ReviewCaseStatus.AwaitingPayment
                    && move.ToStatus != ReviewCaseStatus.PendingExpertResponse
                )
            )
            {
                continue; // never paid: the document was never in review
            }

            if (move.ToStatus == ReviewCaseStatus.PendingExpertResponse)
            {
                var source = await db.DocumentVersions.FindAsync([reviewCase.SourceVersionId], ct);
                source?.LockForReview(reviewCase.Id);
                await SyncDocumentAsync(db, reviewCase, true, null, move.CreatedAt, ct);
            }
            else if (
                move.FromStatus == ReviewCaseStatus.InReview
                && move.ToStatus == ReviewCaseStatus.AwaitingAcceptance
            )
            {
                // A retried save must not add the expert's version twice
                if (
                    db.DocumentVersions.Local.Any(v =>
                        v.ReviewCaseId == reviewCase.Id
                        && v.VersionType == DocumentVersion.ExpertReviewed
                    )
                )
                {
                    continue;
                }
                // ponytail: max+1 can race a draft saved at the same moment, the unique fails the save, retry works
                var last =
                    await db
                        .DocumentVersions.Where(v => v.DocumentId == reviewCase.DocumentId)
                        .MaxAsync(v => (int?)v.VersionNo, ct)
                    ?? 0;
                db.DocumentVersions.Add(
                    DocumentVersion.ExpertReview(reviewCase, last + 1, move.CreatedAt)
                );
            }
            else if (!ReviewCase.OpenStatuses.Contains(move.ToStatus))
            {
                var verified = reviewCase.VerifiedOutcome
                    ? await db
                        .DocumentVersions.Where(v =>
                            v.ReviewCaseId == reviewCase.Id
                            && v.VersionType == DocumentVersion.ExpertReviewed
                        )
                        .Select(v => (Guid?)v.Id)
                        .FirstOrDefaultAsync(ct)
                    : null;
                var stillOpen = await db.ReviewCases.AnyAsync(
                    x =>
                        x.DocumentId == reviewCase.DocumentId
                        && x.Id != reviewCase.Id
                        && PaidOpen.Contains(x.Status),
                    ct
                );
                await SyncDocumentAsync(db, reviewCase, stillOpen, verified, move.CreatedAt, ct);
            }
        }
    }

    private static async Task SyncDocumentAsync(
        WorkflowDbContext db,
        ReviewCase reviewCase,
        bool paidCaseOpen,
        Guid? verifiedVersionId,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var document = await db.Documents.FindAsync([reviewCase.DocumentId], ct);
        document?.SyncReview(paidCaseOpen, verifiedVersionId, now);
    }
}
