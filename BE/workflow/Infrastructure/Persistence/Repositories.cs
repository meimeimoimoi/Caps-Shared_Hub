using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Review;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence;

/// <summary>EF Core store for review cases.</summary>
public sealed class ReviewCaseRepository(WorkflowDbContext db) : IReviewCaseRepository
{
    public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
        db.ReviewCases.AsNoTracking().SingleOrDefaultAsync(x => x.Id == reviewCaseId, ct);

    public void Add(ReviewCase reviewCase) => db.ReviewCases.Add(reviewCase);

    public void AddHistory(ReviewStatusHistory history) => db.ReviewStatusHistories.Add(history);

    //Row clock until the transaction ends, so a user action the expiry job never both move the case
    public Task<ReviewCase?> FindForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
        db
            .ReviewCases.FromSqlInterpolated(
                $"SELECT * FROM review.review_case WHERE id = {reviewCaseId} FOR UPDATE"
            )
            .SingleOrDefaultAsync(x => x.Id == reviewCaseId, ct);

    //newest 100, no paging; add a cursor like the chat when use have more cases
    public async Task<IReadOnlyList<ReviewCase>> ListForUserAsync(Guid userId, CancellationToken ct)
    {
        var unpaid = ReviewCase.UnpaidStatuses;
        return await db
            .ReviewCases.AsNoTracking()
            .Where(x =>
                x.RequesterUserId == userId
                || (x.ExpertUserId == userId && !unpaid.Contains(x.Status))
            )
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<Guid>> ListPendingIdsAsync(
        Guid expertUserId,
        string? serviceCode,
        CancellationToken ct
    ) =>
        await db
            .ReviewCases.Where(x =>
                x.ExpertUserId == expertUserId
                && (serviceCode == null || x.ServiceCode == serviceCode)
                && x.Status == ReviewCaseStatus.PendingExpertResponse
            )
            .Select(x => x.Id)
            .ToListAsync(ct);
}

/// <summary>EF Core store for client disputes; a case has at most one.</summary>
public sealed class ReviewDisputeRepository(WorkflowDbContext db) : IReviewDisputeRepository
{
    public Task<ReviewDispute?> FindByCaseAsync(Guid reviewCaseId, CancellationToken ct) =>
        db.ReviewDisputes.SingleOrDefaultAsync(x => x.ReviewCaseId == reviewCaseId, ct);

    public void Add(ReviewDispute dispute) => db.ReviewDisputes.Add(dispute);

    // the 200 earliest deadlines, no paging; add a cursor when the queue grows
    public async Task<IReadOnlyList<(ReviewDispute Dispute, ReviewCase Case)>> ListOpenAsync(
        CancellationToken ct
    )
    {
        var rows = await (
            from d in db.ReviewDisputes.AsNoTracking()
            join c in db.ReviewCases.AsNoTracking() on d.ReviewCaseId equals c.Id
            where d.Status == ReviewDispute.Open
            orderby d.DecideBy
            select new { d, c }
        )
            .Take(200)
            .ToListAsync(ct);
        return rows.ConvertAll(x => (x.d, x.c));
    }
}

/// <summary>EF Core store for the expert's questions to the client.</summary>
public sealed class InfoRequestRepository(WorkflowDbContext db) : IInfoRequestRepository
{
    public Task<InfoRequest?> FindOpenForUpdateAsync(Guid reviewCaseId, CancellationToken ct) =>
        db.InfoRequests.SingleOrDefaultAsync(
            x => x.ReviewCaseId == reviewCaseId && x.Status == InfoRequest.Open,
            ct
        );

    public void Add(InfoRequest request) => db.InfoRequests.Add(request);
}

/// <summary>EF Core store for review case messages.</summary>
public sealed class CaseMessageRepository(WorkflowDbContext db) : ICaseMessageRepository
{
    public Task<CaseMessage?> FindAsync(Guid reviewCaseId, Guid messageId, CancellationToken ct) =>
        db
            .CaseMessages.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == messageId && x.ReviewCaseId == reviewCaseId, ct);

    public async Task<IReadOnlyList<CaseMessage>> ListAsync(
        Guid reviewCaseId,
        DateTimeOffset? before,
        DateTimeOffset? after,
        int limit,
        CancellationToken ct
    )
    {
        var query = db.CaseMessages.AsNoTracking().Where(x => x.ReviewCaseId == reviewCaseId);
        if (before is { } b)
            query = query.Where(x => x.CreatedAt < b);
        if (after is { } a)
        {
            return await query
                .Where(x => x.CreatedAt > a)
                .OrderBy(x => x.CreatedAt)
                .Take(limit)
                .ToListAsync(ct);
        }
        var newest = await query.OrderByDescending(x => x.CreatedAt).Take(limit).ToListAsync(ct);
        newest.Reverse();
        return newest;
    }

    public async Task<IReadOnlyDictionary<Guid, int>> CountUnreadAsync(
        Guid userId,
        CancellationToken ct
    ) =>
        await (
            from m in db.CaseMessages
            join c in db.ReviewCases on m.ReviewCaseId equals c.Id
            where
                (c.RequesterUserId == userId || c.ExpertUserId == userId)
                && m.SenderUserId != userId
            join r in db.CaseReadMarkers.Where(r => r.UserId == userId)
                on m.ReviewCaseId equals r.ReviewCaseId
                into markers
            from r in markers.DefaultIfEmpty()
            where r == null || m.CreatedAt > r.LastReadAt
            group m by m.ReviewCaseId into g
            select new { g.Key, Count = g.Count() }
        ).ToDictionaryAsync(x => x.Key, x => x.Count, ct);

    public void Add(CaseMessage message) => db.CaseMessages.Add(message);
}

/// <summary>EF Core store for how far each party has read a case's messages.</summary>
public sealed class CaseReadMarkerRepository(WorkflowDbContext db) : ICaseReadMarkerRepository
{
    public Task<CaseReadMarker?> FindAsync(Guid reviewCaseId, Guid userId, CancellationToken ct) =>
        db.CaseReadMarkers.SingleOrDefaultAsync(
            x => x.ReviewCaseId == reviewCaseId && x.UserId == userId,
            ct
        );

    public void Add(CaseReadMarker marker) => db.CaseReadMarkers.Add(marker);
}

/// <summary>EF Core reads of the client's documents.</summary>
public sealed class DocumentRepository(WorkflowDbContext db) : IDocumentRepository
{
    public Task<bool> OwnsVersionAsync(
        Guid userId,
        Guid documentId,
        Guid versionId,
        CancellationToken ct
    ) =>
        db.DocumentVersions.AnyAsync(
            v =>
                v.Id == versionId
                && v.DocumentId == documentId
                && db.Documents.Any(d => d.Id == documentId && d.OwnerUserId == userId),
            ct
        );
}
