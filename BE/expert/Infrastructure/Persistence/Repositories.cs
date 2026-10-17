using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>EF Core store for expert profiles.</summary>
public sealed class ExpertProfileRepository(ExpertDbContext db) : IExpertProfileRepository
{
    public Task<ExpertProfile?> FindByUserAsync(Guid userId, CancellationToken ct) =>
        db.ExpertProfiles.SingleOrDefaultAsync(x => x.UserId == userId, ct);

    public void Add(ExpertProfile profile) => db.ExpertProfiles.Add(profile);
}

/// <summary>EF Core store for applications and their history.</summary>
public sealed class ExpertApplicationRepository(ExpertDbContext db) : IExpertApplicationRepository
{
    public Task<ExpertApplication?> FindLatestAsync(Guid profileId, CancellationToken ct) =>
        db
            .ExpertApplications.Where(x => x.ExpertProfileId == profileId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public Task<ExpertApplication?> FindWithProfileAsync(
        Guid applicationId,
        CancellationToken ct
    ) =>
        db
            .ExpertApplications.Include(x => x.ExpertProfile)
            .SingleOrDefaultAsync(x => x.Id == applicationId, ct);

    public Task<Guid?> FindApplicantUserIdAsync(Guid applicationId, CancellationToken ct) =>
        db
            .ExpertApplications.Where(x => x.Id == applicationId)
            .Select(x => (Guid?)x.ExpertProfile.UserId)
            .SingleOrDefaultAsync(ct);

    public async Task<IReadOnlyList<ExpertApplication>> ListByStatusAsync(
        string status,
        CancellationToken ct
    ) =>
        await db
            .ExpertApplications.AsNoTracking()
            .Include(x => x.ExpertProfile)
            .Where(x => x.Status == status)
            .OrderBy(x => x.SubmittedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ExpertApplicationEvent>> ListEventsAsync(
        Guid applicationId,
        CancellationToken ct
    ) =>
        await db
            .ExpertApplicationEvents.AsNoTracking()
            .Where(x => x.ApplicationId == applicationId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);

    public void Add(ExpertApplication application) => db.ExpertApplications.Add(application);

    public void AddEvent(ExpertApplicationEvent applicationEvent) =>
        db.ExpertApplicationEvents.Add(applicationEvent);
}

/// <summary>EF Core store for evidence metadata.</summary>
public sealed class ExpertEvidenceRepository(ExpertDbContext db) : IExpertEvidenceRepository
{
    public async Task<IReadOnlyList<ExpertEvidence>> ListAsync(
        Guid applicationId,
        CancellationToken ct
    ) =>
        await db
            .ExpertEvidences.AsNoTracking()
            .Where(x => x.ApplicationId == applicationId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);

    public Task<int> CountAsync(Guid applicationId, CancellationToken ct) =>
        db.ExpertEvidences.CountAsync(x => x.ApplicationId == applicationId, ct);

    public Task<bool> HasCodeAsync(Guid applicationId, string code, CancellationToken ct) =>
        db.ExpertEvidences.AnyAsync(
            x => x.ApplicationId == applicationId && x.EvidenceType == code,
            ct
        );

    public Task<bool> AnyAddedAfterAsync(
        Guid applicationId,
        DateTimeOffset? since,
        CancellationToken ct
    ) =>
        db.ExpertEvidences.AnyAsync(
            x => x.ApplicationId == applicationId && x.CreatedAt > since,
            ct
        );

    public Task<ExpertEvidence?> FindAsync(
        Guid evidenceId,
        Guid applicationId,
        CancellationToken ct
    ) =>
        db.ExpertEvidences.SingleOrDefaultAsync(
            x => x.Id == evidenceId && x.ApplicationId == applicationId,
            ct
        );

    public Task<ExpertEvidence?> FindOwnedAsync(
        Guid evidenceId,
        Guid userId,
        CancellationToken ct
    ) =>
        db
            .ExpertEvidences.AsNoTracking()
            .Where(x =>
                x.Id == evidenceId
                && db.ExpertProfiles.Any(p => p.Id == x.ExpertProfileId && p.UserId == userId)
            )
            .SingleOrDefaultAsync(ct);

    public void Add(ExpertEvidence evidence) => db.ExpertEvidences.Add(evidence);

    public void Remove(ExpertEvidence evidence) => db.ExpertEvidences.Remove(evidence);
}

/// <summary>EF Core store for Gate 1 per-requirement results.</summary>
public sealed class EligibilityCheckRepository(ExpertDbContext db) : IEligibilityCheckRepository
{
    public async Task<IReadOnlyList<EligibilityCheck>> ListLatestAsync(
        Guid applicationId,
        CancellationToken ct
    )
    {
        var rows = db.EligibilityChecks.AsNoTracking().Where(x => x.ApplicationId == applicationId);
        var latest = await rows.MaxAsync(x => (DateTimeOffset?)x.CreatedAt, ct);
        if (latest == null)
            return [];
        var checks = await rows.Where(x => x.CreatedAt == latest).ToListAsync(ct);
        return checks.OrderBy(x => Array.IndexOf(EligibilityCriteria.Codes, x.Criterion)).ToList();
    }

    public void AddRange(IEnumerable<EligibilityCheck> checks) =>
        db.EligibilityChecks.AddRange(checks);
}

/// <summary>EF Core store for the service catalog.</summary>
public sealed class ServiceCatalogRepository(ExpertDbContext db) : IServiceCatalogRepository
{
    public async Task<IReadOnlyList<ServiceCatalogItem>> ListActiveAsync(CancellationToken ct) =>
        await db
            .ServiceCatalog.AsNoTracking()
            .Where(x => x.Status == ServiceCatalogItem.Active)
            .OrderBy(x => x.SortOrder)
            .ToListAsync(ct);
}
