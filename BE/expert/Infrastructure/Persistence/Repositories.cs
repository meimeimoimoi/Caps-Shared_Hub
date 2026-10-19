using Caps.Expert.Application.Abstractions;
using Caps.Expert.Application.Common;
using Caps.Expert.Application.DTOs.Responses;
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

    public Task<int> CountActiveOfferingsAsync(Guid profileId, CancellationToken ct) =>
        db.ServiceOfferings.CountAsync(o => o.ExpertProfileId == profileId && o.IsActive, ct);
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
}

/// <summary>Marketplace reads: one SQL query each, only the columns the page shows.</summary>
public sealed class MarketplaceReader(ExpertDbContext db) : IMarketplaceReader
{
    public async Task<IReadOnlyList<MarketplaceExpertItem>> SearchAsync(
        MarketplaceFilter filter,
        int skip,
        int take,
        CancellationToken ct
    )
    {
        var serviceType = filter.ServiceType;
        // Per-expert values computed once in SQL, then reused by filters, sorting and the result.
        // With a service chosen, start from its packages (one active per expert): fee and turnaround
        // are plain columns there instead of correlated subqueries run for every expert.
        var rows =
            serviceType == null
                ? Approved()
                    .Select(p => new
                    {
                        Profile = p,
                        Available = p.ServiceStatus == ExpertServiceStatus.Active
                            && p.ActiveCases < p.Capacity,
                        Trusted = p.DeliveredCount >= ExpertProfile.MinCasesForRate
                            && p.VerifiedCount * 100
                                >= ExpertProfile.VerifiedTargetPercent * p.DeliveredCount,
                        Fee = p.ServiceOfferings.Where(o => o.IsActive).Min(o => (long?)o.Fee),
                        Turnaround = p
                            .ServiceOfferings.Where(o => o.IsActive)
                            .Min(o => (int?)o.TurnaroundHours),
                    })
                : db
                    .ServiceOfferings.Where(o =>
                        o.IsActive
                        && o.ServiceType == serviceType
                        && o.ExpertProfile.Status == ExpertApplicationStatus.Approved
                    )
                    .Select(o => new
                    {
                        Profile = o.ExpertProfile,
                        Available = o.ExpertProfile.ServiceStatus == ExpertServiceStatus.Active
                            && o.ExpertProfile.ActiveCases < o.ExpertProfile.Capacity,
                        Trusted = o.ExpertProfile.DeliveredCount >= ExpertProfile.MinCasesForRate
                            && o.ExpertProfile.VerifiedCount * 100
                                >= ExpertProfile.VerifiedTargetPercent
                                    * o.ExpertProfile.DeliveredCount,
                        Fee = (long?)o.Fee,
                        Turnaround = (int?)o.TurnaroundHours,
                    });

        if (filter.OpenOnly)
            rows = rows.Where(x => x.Available);
        if (!string.IsNullOrWhiteSpace(filter.Field))
        {
            // ponytail: "= ANY(fields)" scans; add a GIN index on fields when the table grows
            rows = rows.Where(x => x.Profile.Fields.Contains(filter.Field));
        }
        if (filter.MaxTurnaroundHours is > 0)
            rows = rows.Where(x => x.Turnaround <= filter.MaxTurnaroundHours);
        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            // ponytail: ILIKE '%x%' scans; add pg_trgm or full-text search when the table grows
            var pattern = $"%{filter.Keyword.Trim()}%";
            rows = rows.Where(x =>
                EF.Functions.ILike(x.Profile.DisplayName ?? "", pattern)
                || EF.Functions.ILike(x.Profile.Title ?? "", pattern)
            );
        }

        // Fixed orderings chosen by enum: client input never becomes SQL text
        var sorted = filter.Sort switch
        {
            MarketplaceSort.Rating => rows.OrderByDescending(x => x.Profile.RatingAvg)
                .ThenByDescending(x => x.Profile.RatingCount),
            MarketplaceSort.Price => rows.OrderBy(x => x.Fee == null).ThenBy(x => x.Fee), // unpriced last
            MarketplaceSort.Turnaround => rows.OrderBy(x => x.Turnaround == null)
                .ThenBy(x => x.Turnaround), // experts selling nothing matching go last
            // Tiers: free slot first, then VERIFIED ≥ 80%, then quality inside the tier
            _ => rows.OrderByDescending(x => x.Available)
                .ThenByDescending(x => x.Trusted)
                .ThenByDescending(x => x.Profile.RatingAvg)
                .ThenByDescending(x =>
                    x.Profile.DeliveredCount == 0
                        ? 0
                        : x.Profile.VerifiedCount * 100 / x.Profile.DeliveredCount
                )
                .ThenByDescending(x => x.Profile.RatingCount),
        };

        return await sorted
            .ThenBy(x => x.Profile.Id) // stable order so pages never repeat or skip a row
            .Skip(skip)
            .Take(take)
            .Select(x => new MarketplaceExpertItem(
                x.Profile.Id,
                x.Profile.DisplayName,
                x.Profile.Title,
                x.Profile.Fields,
                x.Profile.YearsExperience,
                x.Profile.RatingAvg,
                x.Profile.RatingCount,
                x.Profile.DeliveredCount >= ExpertProfile.MinCasesForRate
                    ? x.Profile.VerifiedCount * 100 / x.Profile.DeliveredCount
                    : null,
                x.Turnaround,
                x.Fee,
                x.Available
            ))
            .ToListAsync(ct);
    }

    public Task<MarketplaceExpertDetail?> FindAsync(Guid id, CancellationToken ct) =>
        Approved()
            .Where(p => p.Id == id)
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
                p.RatingAvg,
                p.RatingCount,
                p.ServiceOfferings.Where(o => o.IsActive)
                    .OrderBy(o => o.Fee)
                    .Select(o => new MarketplaceOffering(
                        o.Id,
                        o.ServiceType,
                        o.Fee,
                        o.TurnaroundHours
                    ))
                    .ToList(),
                p.ServiceStatus == ExpertServiceStatus.Active && p.ActiveCases < p.Capacity,
                p.DeliveredCount >= ExpertProfile.MinCasesForRate
                    ? p.VerifiedCount * 100 / p.DeliveredCount
                    : null
            ))
            .SingleOrDefaultAsync(ct);

    // Paused or full experts stay listed (labeled by Available); only approval decides visibility
    private IQueryable<ExpertProfile> Approved() =>
        db.ExpertProfiles.Where(p => p.Status == ExpertApplicationStatus.Approved);
}

/// <summary>EF Core store for platform fee history.</summary>
public sealed class PlatformFeeRepository(ExpertDbContext db) : IPlatformFeeRepository
{
    public Task<PlatformFee?> FindCurrentAsync(
        string serviceType,
        DateTimeOffset now,
        CancellationToken ct
    ) =>
        db
            .PlatformFees.Where(f => f.ServiceType == serviceType && f.EffectiveFrom <= now)
            .OrderByDescending(f => f.EffectiveFrom)
            .FirstOrDefaultAsync(ct);

    // ponytail: latest row per service via GROUP BY; fine for a handful of services
    public async Task<IReadOnlyList<PlatformFee>> ListCurrentAsync(
        DateTimeOffset now,
        CancellationToken ct
    ) =>
        await db
            .PlatformFees.AsNoTracking()
            .Where(f => f.EffectiveFrom <= now)
            .GroupBy(f => f.ServiceType)
            .Select(g => g.OrderByDescending(f => f.EffectiveFrom).First())
            .ToListAsync(ct);

    public void Add(PlatformFee fee) => db.PlatformFees.Add(fee);
}

/// <summary>EF Core store for the experts' service packages.</summary>
public sealed class ServiceOfferingRepository(ExpertDbContext db) : IServiceOfferingRepository
{
    public Task<ServiceOffering?> FindActiveAsync(
        Guid profileId,
        string serviceType,
        CancellationToken ct
    ) =>
        db.ServiceOfferings.SingleOrDefaultAsync(
            o => o.ExpertProfileId == profileId && o.ServiceType == serviceType && o.IsActive,
            ct
        );

    public async Task<IReadOnlyList<ServiceOffering>> ListActiveAsync(
        Guid profileId,
        CancellationToken ct
    ) =>
        await db
            .ServiceOfferings.AsNoTracking()
            .Where(o => o.ExpertProfileId == profileId && o.IsActive)
            .OrderBy(o => o.ServiceType)
            .ToListAsync(ct);

    public void Add(ServiceOffering offering) => db.ServiceOfferings.Add(offering);
}
