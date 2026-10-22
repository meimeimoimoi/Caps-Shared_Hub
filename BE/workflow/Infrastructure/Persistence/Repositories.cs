using Caps.Workflow.Application.Abstractions;
using Caps.Workflow.Domain.Review;
using Caps.Workflow.Domain.Workspace;
using Microsoft.EntityFrameworkCore;

namespace Caps.Workflow.Infrastructure.Persistence;

/// <summary>EF Core store for review cases.</summary>
public sealed class ReviewCaseRepository(WorkflowDbContext db) : IReviewCaseRepository
{
    public Task<ReviewCase?> FindAsync(Guid reviewCaseId, CancellationToken ct) =>
        db.ReviewCases.AsNoTracking().SingleOrDefaultAsync(x => x.Id == reviewCaseId, ct);
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

/// <summary>EF Core store for document templates and their versions.</summary>
public sealed class TemplateRepository(WorkflowDbContext db) : ITemplateRepository
{
    public async Task<IReadOnlyList<TemplateVersion>> ListPublishedAsync(CancellationToken ct) =>
        await Published().OrderBy(x => x.Template.Name).ToListAsync(ct);

    public Task<TemplateVersion?> FindPublishedAsync(Guid templateId, CancellationToken ct) =>
        Published()
            .Where(x => x.TemplateId == templateId)
            .OrderByDescending(x => x.VersionNo)
            .FirstOrDefaultAsync(ct);

    public Task<Template?> FindByCodeAsync(string code, CancellationToken ct) =>
        db.Templates.SingleOrDefaultAsync(x => x.Code == code, ct);

    public Task<TemplateVersion?> FindLatestVersionAsync(Guid templateId, CancellationToken ct) =>
        db
            .TemplateVersions.Where(x => x.TemplateId == templateId)
            .OrderByDescending(x => x.VersionNo)
            .FirstOrDefaultAsync(ct);

    public void Add(Template newTemplate) => db.Templates.Add(newTemplate);

    public void Add(TemplateVersion version) => db.TemplateVersions.Add(version);

    private IQueryable<TemplateVersion> Published() =>
        db
            .TemplateVersions.AsNoTracking()
            .Include(x => x.Template)
            .Where(x => x.Status == TemplateVersionStatus.Published && x.Template.IsActive);
}
