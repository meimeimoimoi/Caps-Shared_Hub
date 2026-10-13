using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

public sealed class ExpertProfileRepository(ExpertDbContext db) : IExpertProfileRepository
{
    public Task<ExpertProfile?> FindByUserAsync(Guid userId, CancellationToken ct) =>
        db.ExpertProfiles.SingleOrDefaultAsync(x => x.UserId == userId, ct);

    public void Add(ExpertProfile profile) => db.ExpertProfiles.Add(profile);
}

public sealed class ExpertApplicationRepository(ExpertDbContext db) : IExpertApplicationRepository
{
    public Task<ExpertApplication?> FindLatestAsync(Guid profileId, CancellationToken ct) =>
        db
            .ExpertApplications.Where(x => x.ExpertProfileId == profileId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

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
