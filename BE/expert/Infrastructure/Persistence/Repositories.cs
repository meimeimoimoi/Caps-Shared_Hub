using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.DTOs.Responses;
using Caps.Expert.Domain.Applications;
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

    public sealed class MarketplaceReader(ExpertDbContext db) : IMarketplaceReader
    {
        public async Task<IReadOnlyList<MarketplaceExpertItem>> SearchAsync(
            string? keyword,
            string? field,
            DateTimeOffset now,
            int skip,
            int take,
            CancellationToken ct
        )
        {
            var experts = Bookable()
                .Where(p =>
                    // EXISTS on ix_availability_slot_open; no slot rows are loaded
                    db.AvailabilitySlots.Any(s => s.ExpertProfileId == p.Id && s.Status == "OPEN")
                );

            if (!string.IsNullOrWhiteSpace(field))
            {
                // ponytail: "= ANY(fields)" scans; add a GIN index on fields when the table grows
                experts = experts.Where(p => p.Fields.Contains(field));
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                // ponytail: ILIKE '%x%' scans; add pg_trgm or full-text search when the table grows
                experts = experts.Where(p => EF.Functions.ILike(p.DisplayName!, $"%{keyword}%"));
            }

            // Select() projects to the DTO: EF reads only these columns and tracks nothing
            return await experts
                .OrderByDescending(p => p.RatingAvg)
                .ThenBy(p => p.Id) // stable order so pages never repeat or skip a row
                .Skip(skip)
                .Take(take)
                .Select(p => new MarketplaceExpertItem(
                    p.Id,
                    p.DisplayName,
                    p.Title,
                    p.Fields,
                    p.YearsExperience,
                    p.RatingAvg,
                    p.RatingCount,
                    p.ServiceOfferings.Where(o => o.IsActive).Min(o => (long?)o.Fee)
                ))
                .ToListAsync(ct);
        }

        public Task<MarketplaceExpertDetail?> FindAsync(Guid id, CancellationToken ct)
        {
            return Bookable()
                .Where(p => p.Id == id)
                // One query: profile columns + its active offerings
                .Select(p => new MarketplaceExpertDetail(
                    p.Id,
                    p.DisplayName,
                    p.Title,
                    p.Company,
                    p.Location,
                    p.Bio,
                    p.Fields,
                    p.YearsExperience,
                    p.Highlights,
                    p.TurnaroundHours,
                    p.RatingAvg,
                    p.RatingCount,
                    p.ServiceOfferings.Where(o => o.IsActive)
                        .OrderBy(o => o.Fee)
                        .Select(o => new MarketplaceOffering(o.Id, o.ServiceType, o.Fee))
                        .ToList()
                ))
                .SingleOrDefaultAsync(ct);
        }

        private IQueryable<ExpertProfile> Bookable() =>
            db.ExpertProfiles.Where(p =>
                p.Status == ExpertApplicationStatus.Approved
                && p.ServiceStatus == ExpertServiceStatus.Active
            );
    }
}
