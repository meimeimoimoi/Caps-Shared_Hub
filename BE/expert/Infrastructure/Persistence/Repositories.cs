using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Applications;
using Caps.Expert.Domain.Catalog;
using Caps.Expert.Domain.Policies;
using Caps.Expert.Domain.Pricing;
using Caps.Expert.Domain.Profiles;
using Caps.Expert.Domain.Qualifications;
using Caps.Expert.Domain.Reviews;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>EF Core store for expert profiles.</summary>
public sealed class ExpertProfileRepository(ExpertDbContext db) : IExpertProfileRepository
{
    public Task<ExpertProfile?> FindByUserAsync(Guid userId, CancellationToken ct) =>
        db.ExpertProfiles.SingleOrDefaultAsync(x => x.UserId == userId, ct);

    public Task<ExpertProfile?> FindAsync(Guid profileId, CancellationToken ct) =>
        db.ExpertProfiles.AsNoTracking().SingleOrDefaultAsync(x => x.Id == profileId, ct);

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

    public async Task<bool> TryClaimAsync(
        ExpertApplication application,
        Guid reviewerUserId,
        DateTimeOffset now,
        DateTimeOffset expiredBefore,
        CancellationToken ct
    )
    {
        // One conditional UPDATE, never read-then-write: the row is only taken while it is still free
        var updated = await db
            .ExpertApplications.Where(x =>
                x.Id == application.Id
                && x.Status == ExpertApplicationStatus.Submitted
                && (
                    x.ClaimedByUserId == null
                    || x.ClaimedByUserId == reviewerUserId
                    || x.ClaimedAt <= expiredBefore
                )
            )
            .ExecuteUpdateAsync(
                s =>
                    s.SetProperty(x => x.ClaimedByUserId, reviewerUserId)
                        .SetProperty(x => x.ClaimedAt, now)
                        .SetProperty(x => x.UpdatedAt, now),
                ct
            );
        if (updated == 0)
            return false;
        await db.Entry(application).ReloadAsync(ct);
        return true;
    }

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
            .Where(x => x.ApplicationId == applicationId && x.QualificationId == null)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);

    public Task<int> CountAsync(Guid applicationId, CancellationToken ct) =>
        db.ExpertEvidences.CountAsync(
            x => x.ApplicationId == applicationId && x.QualificationId == null,
            ct
        );

    public Task<bool> HasCodeAsync(Guid applicationId, string code, CancellationToken ct) =>
        db.ExpertEvidences.AnyAsync(
            x =>
                x.ApplicationId == applicationId
                && x.QualificationId == null
                && x.EvidenceType == code,
            ct
        );

    public Task<bool> AnyAddedAfterAsync(
        Guid applicationId,
        DateTimeOffset? since,
        CancellationToken ct
    ) =>
        db.ExpertEvidences.AnyAsync(
            x =>
                x.ApplicationId == applicationId
                && x.QualificationId == null
                && x.CreatedAt > since,
            ct
        );

    public Task<ExpertEvidence?> FindAsync(
        Guid evidenceId,
        Guid applicationId,
        CancellationToken ct
    ) =>
        db.ExpertEvidences.SingleOrDefaultAsync(
            x =>
                x.Id == evidenceId && x.ApplicationId == applicationId && x.QualificationId == null,
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

    public Task<ServiceCatalogItem?> FindAsync(string code, CancellationToken ct) =>
        db.ServiceCatalog.AsNoTracking().SingleOrDefaultAsync(x => x.Code == code, ct);
}

/// <summary>EF Core store for Expert-Service qualifications and their history.</summary>
public sealed class QualificationRepository(ExpertDbContext db) : IQualificationRepository
{
    public Task<ExpertServiceQualification?> FindLatestAsync(
        Guid profileId,
        string serviceCode,
        CancellationToken ct
    ) =>
        db
            .Qualifications.Where(x =>
                x.ExpertProfileId == profileId && x.ServiceCode == serviceCode
            )
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync(ct);

    public async Task<IReadOnlyList<ExpertServiceQualification>> ListLatestByProfileAsync(
        Guid profileId,
        CancellationToken ct
    )
    {
        var all = await db
            .Qualifications.AsNoTracking()
            .Where(x => x.ExpertProfileId == profileId)
            .ToListAsync(ct);
        return all.GroupBy(x => x.ServiceCode)
            .Select(g => g.OrderByDescending(x => x.CreatedAt).First())
            .ToList();
    }

    public Task<ExpertServiceQualification?> FindOwnedAsync(
        Guid qualificationId,
        Guid userId,
        CancellationToken ct
    ) =>
        db
            .Qualifications.Include(x => x.ExpertProfile)
            .SingleOrDefaultAsync(
                x => x.Id == qualificationId && x.ExpertProfile.UserId == userId,
                ct
            );

    public Task<ExpertServiceQualification?> FindWithProfileAsync(
        Guid qualificationId,
        CancellationToken ct
    ) =>
        db
            .Qualifications.Include(x => x.ExpertProfile)
            .SingleOrDefaultAsync(x => x.Id == qualificationId, ct);

    public Task<Guid?> FindApplicantUserIdAsync(Guid qualificationId, CancellationToken ct) =>
        db
            .Qualifications.Where(x => x.Id == qualificationId)
            .Select(x => (Guid?)x.ExpertProfile.UserId)
            .SingleOrDefaultAsync(ct);

    public async Task<IReadOnlyList<ExpertServiceQualification>> ListByStatusAsync(
        string status,
        CancellationToken ct
    ) =>
        await db
            .Qualifications.AsNoTracking()
            .Include(x => x.ExpertProfile)
            .Where(x => x.Status == status)
            .OrderBy(x => x.SubmittedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<QualificationEvent>> ListEventsAsync(
        Guid qualificationId,
        CancellationToken ct
    ) =>
        await db
            .QualificationEvents.AsNoTracking()
            .Where(x => x.QualificationId == qualificationId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ExpertServiceQualification>> ListMarketplaceCandidatesAsync(
        string? serviceCode,
        Guid? profileId,
        CancellationToken ct
    ) =>
        await db
            .Qualifications.AsNoTracking()
            .Include(x => x.ExpertProfile)
            .Where(x =>
                x.Status == QualificationStatus.ApprovedForService
                && x.AcceptingRequests
                && (serviceCode == null || x.ServiceCode == serviceCode)
                && (profileId == null || x.ExpertProfileId == profileId)
            )
            .ToListAsync(ct);

    public async Task<bool> TryClaimAsync(
        ExpertServiceQualification qualification,
        Guid reviewerUserId,
        DateTimeOffset now,
        DateTimeOffset expiredBefore,
        CancellationToken ct
    )
    {
        // One conditional UPDATE, never read-then-write: the row is only taken while it is still free
        var updated = await db
            .Qualifications.Where(x =>
                x.Id == qualification.Id
                && x.Status == QualificationStatus.CompetencyReview
                && (
                    x.ClaimedByUserId == null
                    || x.ClaimedByUserId == reviewerUserId
                    || x.ClaimedAt <= expiredBefore
                )
            )
            .ExecuteUpdateAsync(
                s =>
                    s.SetProperty(x => x.ClaimedByUserId, reviewerUserId)
                        .SetProperty(x => x.ClaimedAt, now)
                        .SetProperty(x => x.UpdatedAt, now),
                ct
            );
        if (updated == 0)
            return false;
        await db.Entry(qualification).ReloadAsync(ct);
        return true;
    }

    public void Add(ExpertServiceQualification qualification) =>
        db.Qualifications.Add(qualification);

    public void AddEvent(QualificationEvent qualificationEvent) =>
        db.QualificationEvents.Add(qualificationEvent);
}

/// <summary>EF Core store for Gate 2 per-competency results and the files they cite.</summary>
public sealed class CompetencyAssessmentRepository(ExpertDbContext db)
    : ICompetencyAssessmentRepository
{
    public async Task<IReadOnlyList<CompetencyAssessment>> ListLatestAsync(
        Guid qualificationId,
        CancellationToken ct
    )
    {
        var rows = db
            .CompetencyAssessments.AsNoTracking()
            .Where(x => x.QualificationId == qualificationId);
        var latest = await rows.MaxAsync(x => (DateTimeOffset?)x.CreatedAt, ct);
        if (latest == null)
            return [];
        var results = await rows.Where(x => x.CreatedAt == latest)
            .Include(x => x.Evidence)
            .ToListAsync(ct);
        return results.OrderBy(x => Array.IndexOf(CompetencyCriteria.Codes, x.Competency)).ToList();
    }

    public void AddRange(IEnumerable<CompetencyAssessment> assessments) =>
        db.CompetencyAssessments.AddRange(assessments);
}

/// <summary>EF Core store for the files a qualification can rely on.</summary>
public sealed class QualificationEvidenceRepository(ExpertDbContext db)
    : IQualificationEvidenceRepository
{
    public async Task<IReadOnlyList<ExpertEvidence>> ListAsync(
        ExpertServiceQualification qualification,
        CancellationToken ct
    )
    {
        var files = await Usable(qualification).AsNoTracking().ToListAsync(ct);
        return files.OrderBy(x => x.QualificationId != null).ThenBy(x => x.CreatedAt).ToList();
    }

    public Task<int> CountAddedAsync(Guid qualificationId, CancellationToken ct) =>
        db.ExpertEvidences.CountAsync(x => x.QualificationId == qualificationId, ct);

    public Task<bool> AnyAddedAfterAsync(
        Guid qualificationId,
        DateTimeOffset since,
        CancellationToken ct
    ) =>
        db.ExpertEvidences.AnyAsync(
            x => x.QualificationId == qualificationId && x.CreatedAt > since,
            ct
        );

    public Task<ExpertEvidence?> FindAsync(
        Guid evidenceId,
        ExpertServiceQualification qualification,
        CancellationToken ct
    ) => Usable(qualification).SingleOrDefaultAsync(x => x.Id == evidenceId, ct);

    // The Gate 1 application files plus those added for this qualification
    private IQueryable<ExpertEvidence> Usable(ExpertServiceQualification qualification) =>
        db.ExpertEvidences.Where(x =>
            x.QualificationId == qualification.Id
            || (x.QualificationId == null && x.ApplicationId == qualification.ApplicationId)
        );
}

/// <summary>EF Core store for Pricing Versions and their audit trail.</summary>
public sealed class PricingRepository(ExpertDbContext db) : IPricingRepository
{
    private static readonly string[] OpenStatuses =
    [
        PricingStatus.Draft,
        PricingStatus.ReturnForRevision,
        PricingStatus.PendingApproval,
    ];

    public async Task<IReadOnlyList<ServicePricingVersion>> ListAsync(
        Guid qualificationId,
        CancellationToken ct
    ) =>
        await db
            .PricingVersions.AsNoTracking()
            .Where(x => x.QualificationId == qualificationId)
            .OrderByDescending(x => x.Sequence)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ServicePricingVersion>> ListByProfileAsync(
        Guid profileId,
        CancellationToken ct
    ) =>
        await db
            .PricingVersions.AsNoTracking()
            .Where(x => x.ExpertProfileId == profileId)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<ServicePricingVersion>> ListByQualificationsAsync(
        IReadOnlyCollection<Guid> qualificationIds,
        CancellationToken ct
    ) =>
        await db
            .PricingVersions.AsNoTracking()
            .Where(x => qualificationIds.Contains(x.QualificationId))
            .ToListAsync(ct);

    public Task<ServicePricingVersion?> FindOpenAsync(Guid qualificationId, CancellationToken ct) =>
        db.PricingVersions.SingleOrDefaultAsync(
            x => x.QualificationId == qualificationId && OpenStatuses.Contains(x.Status),
            ct
        );

    public Task<ServicePricingVersion?> FindLatestApprovedAsync(
        Guid qualificationId,
        CancellationToken ct
    ) =>
        db
            .PricingVersions.Where(x =>
                x.QualificationId == qualificationId && x.Status == PricingStatus.Approved
            )
            .OrderByDescending(x => x.Sequence)
            .FirstOrDefaultAsync(ct);

    public Task<ServicePricingVersion?> FindAsync(Guid versionId, CancellationToken ct) =>
        db.PricingVersions.SingleOrDefaultAsync(x => x.Id == versionId, ct);

    public async Task<int> MaxSequenceAsync(Guid qualificationId, CancellationToken ct) =>
        await db
            .PricingVersions.Where(x => x.QualificationId == qualificationId)
            .MaxAsync(x => (int?)x.Sequence, ct)
        ?? 0;

    public Task<Guid?> FindExpertUserIdAsync(Guid versionId, CancellationToken ct) =>
        db
            .PricingVersions.Where(x => x.Id == versionId)
            .Select(x =>
                db.ExpertProfiles.Where(p => p.Id == x.ExpertProfileId)
                    .Select(p => (Guid?)p.UserId)
                    .FirstOrDefault()
            )
            .SingleOrDefaultAsync(ct);

    public async Task<IReadOnlyList<ServicePricingVersion>> ListByStatusAsync(
        string status,
        CancellationToken ct
    ) =>
        await db
            .PricingVersions.AsNoTracking()
            .Where(x => x.Status == status)
            .OrderBy(x => x.SubmittedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<PricingEvent>> ListEventsAsync(
        Guid qualificationId,
        CancellationToken ct
    ) =>
        await db
            .PricingEvents.AsNoTracking()
            .Where(x => x.QualificationId == qualificationId)
            .OrderBy(x => x.CreatedAt)
            .ThenBy(x => x.Id)
            .ToListAsync(ct);

    public Task<int> CountEventsAsync(Guid qualificationId, CancellationToken ct) =>
        db.PricingEvents.CountAsync(x => x.QualificationId == qualificationId, ct);

    public void Add(ServicePricingVersion version) => db.PricingVersions.Add(version);

    public void AddEvents(IEnumerable<PricingEvent> events) => db.PricingEvents.AddRange(events);
}

/// <summary>EF Core store for availability slots.</summary>
public sealed class AvailabilityRepository(ExpertDbContext db) : IAvailabilityRepository
{
    public async Task<IReadOnlyList<AvailabilitySlot>> ListOpenAsync(
        Guid profileId,
        DateTimeOffset now,
        CancellationToken ct
    ) =>
        await db
            .AvailabilitySlots.AsNoTracking()
            .Where(x =>
                x.ExpertProfileId == profileId && x.Status == AvailabilitySlot.Open && x.EndAt > now
            )
            .OrderBy(x => x.StartAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<AvailabilitySlot>> ListOpenAsync(
        IReadOnlyCollection<Guid> profileIds,
        DateTimeOffset now,
        CancellationToken ct
    ) =>
        await db
            .AvailabilitySlots.AsNoTracking()
            .Where(x =>
                profileIds.Contains(x.ExpertProfileId)
                && x.Status == AvailabilitySlot.Open
                && x.StartAt > now
            )
            .OrderBy(x => x.StartAt)
            .ToListAsync(ct);

    public Task<AvailabilitySlot?> FindAsync(Guid slotId, Guid profileId, CancellationToken ct) =>
        db.AvailabilitySlots.SingleOrDefaultAsync(
            x => x.Id == slotId && x.ExpertProfileId == profileId,
            ct
        );

    public void Add(AvailabilitySlot slot) => db.AvailabilitySlots.Add(slot);

    public void Remove(AvailabilitySlot slot) => db.AvailabilitySlots.Remove(slot);
}

/// <summary>EF Core store for policy values changed by a System Admin and their history.</summary>
public sealed class PolicySettingRepository(ExpertDbContext db) : IPolicySettingRepository
{
    public async Task<IReadOnlyList<PolicySetting>> ListAsync(CancellationToken ct) =>
        await db.PolicySettings.ToListAsync(ct);

    public async Task<IReadOnlyList<PolicySettingChange>> ListChangesAsync(
        int limit,
        CancellationToken ct
    ) =>
        await db
            .PolicySettingChanges.AsNoTracking()
            .OrderByDescending(x => x.ChangedAt)
            .Take(limit)
            .ToListAsync(ct);

    public void Add(PolicySetting setting) => db.PolicySettings.Add(setting);

    public void AddChange(PolicySettingChange change) => db.PolicySettingChanges.Add(change);
}

/// <summary>EF Core store for the claim history of reviews.</summary>
public sealed class ReviewClaimEventRepository(ExpertDbContext db) : IReviewClaimEventRepository
{
    public async Task<IReadOnlyList<ReviewClaimEvent>> ListAsync(
        string gate,
        Guid reviewId,
        CancellationToken ct
    ) =>
        await db
            .ReviewClaimEvents.AsNoTracking()
            .Where(x => x.Gate == gate && x.ReviewId == reviewId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);

    public void Add(ReviewClaimEvent claimEvent) => db.ReviewClaimEvents.Add(claimEvent);
}

/// <summary>EF Core store for the reviewers this service has seen.</summary>
public sealed class KnownReviewerRepository(ExpertDbContext db) : IKnownReviewerRepository
{
    public Task<KnownReviewer?> FindAsync(Guid userId, CancellationToken ct) =>
        db.KnownReviewers.SingleOrDefaultAsync(x => x.UserId == userId, ct);

    public async Task<IReadOnlyDictionary<Guid, string?>> FindEmailsAsync(
        IReadOnlyCollection<Guid> userIds,
        CancellationToken ct
    ) =>
        await db
            .KnownReviewers.AsNoTracking()
            .Where(x => userIds.Contains(x.UserId))
            .ToDictionaryAsync(x => x.UserId, x => x.Email, ct);

    public async Task<IReadOnlyList<KnownReviewer>> ListAsync(CancellationToken ct) =>
        await db.KnownReviewers.AsNoTracking().OrderBy(x => x.Email).ToListAsync(ct);

    public void Add(KnownReviewer reviewer) => db.KnownReviewers.Add(reviewer);
}

/// <summary>EF Core store for files tied to competencies and the expert's descriptions.</summary>
public sealed class CompetencyEvidenceRepository(ExpertDbContext db) : ICompetencyEvidenceRepository
{
    public async Task<IReadOnlyList<CompetencyEvidenceLink>> ListLinksAsync(
        Guid qualificationId,
        CancellationToken ct
    ) =>
        await db
            .CompetencyEvidenceLinks.AsNoTracking()
            .Where(x => x.QualificationId == qualificationId)
            .OrderBy(x => x.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<CompetencyEvidenceLink>> ListLinksForEvidenceAsync(
        Guid evidenceId,
        CancellationToken ct
    ) => await db.CompetencyEvidenceLinks.Where(x => x.EvidenceId == evidenceId).ToListAsync(ct);

    public async Task<IReadOnlyList<CompetencyDescription>> ListDescriptionsAsync(
        Guid qualificationId,
        CancellationToken ct
    ) =>
        await db
            .CompetencyDescriptions.AsNoTracking()
            .Where(x => x.QualificationId == qualificationId)
            .ToListAsync(ct);

    public Task<CompetencyDescription?> FindDescriptionAsync(
        Guid qualificationId,
        string competency,
        CancellationToken ct
    ) =>
        db.CompetencyDescriptions.SingleOrDefaultAsync(
            x => x.QualificationId == qualificationId && x.Competency == competency,
            ct
        );

    public void AddLinks(IEnumerable<CompetencyEvidenceLink> links) =>
        db.CompetencyEvidenceLinks.AddRange(links);

    public void RemoveLinks(IEnumerable<CompetencyEvidenceLink> links) =>
        db.CompetencyEvidenceLinks.RemoveRange(links);

    public void AddDescription(CompetencyDescription description) =>
        db.CompetencyDescriptions.Add(description);

    public void RemoveDescription(CompetencyDescription description) =>
        db.CompetencyDescriptions.Remove(description);
}
