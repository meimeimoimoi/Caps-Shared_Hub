using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Qualifications;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>EF Core queries behind the admin expert list; one query per table, joined in memory by id.</summary>
public sealed class ManagedExpertReader(ExpertDbContext db) : IManagedExpertReader
{
    private static readonly string[] Managed =
    [
        QualificationStatus.ApprovedForService,
        QualificationStatus.Suspended,
    ];

    public async Task<IReadOnlyList<ManagedExpertRow>> ListAsync(CancellationToken ct)
    {
        var qualifications = await db
            .Qualifications.AsNoTracking()
            .Include(q => q.ExpertProfile)
            .Where(q => Managed.Contains(q.Status))
            .ToListAsync(ct);
        if (qualifications.Count == 0)
            return [];

        var ids = qualifications.Select(q => q.Id).ToArray();
        var profileIds = qualifications.Select(q => q.ExpertProfileId).Distinct().ToArray();
        var events = (
            await db
                .QualificationEvents.AsNoTracking()
                .Where(e => ids.Contains(e.QualificationId))
                .OrderBy(e => e.CreatedAt)
                .ToListAsync(ct)
        ).ToLookup(e => e.QualificationId);
        var prices = await db
            .ServiceOfferings.AsNoTracking()
            .Where(o => profileIds.Contains(o.ExpertProfileId))
            .ToListAsync(ct);

        return qualifications
            .Select(q =>
            {
                var profile = q.ExpertProfile;
                var price = prices.FirstOrDefault(p =>
                    p.ExpertProfileId == q.ExpertProfileId && p.ServiceCode == q.ServiceCode
                );
                var history = events[q.Id];
                // First final approval; a reinstatement after suspension does not move it
                var approvedAt = history
                    .Where(e =>
                        e.FromStatus == QualificationStatus.PendingFinalApproval
                        && e.ToStatus == QualificationStatus.ApprovedForService
                    )
                    .Select(e => (DateTimeOffset?)e.CreatedAt)
                    .FirstOrDefault();
                return new ManagedExpertRow(
                    q.Id,
                    q.ApplicationId,
                    q.ExpertProfileId,
                    profile.UserId,
                    profile.DisplayName,
                    profile.ContactEmail,
                    profile.YearsExperience,
                    profile.Fields,
                    q.ServiceCode,
                    q.Status,
                    q.AcceptingRequests,
                    price?.Fee,
                    price?.TurnaroundHours,
                    profile.Capacity,
                    profile.ActiveCases,
                    approvedAt ?? q.DecidedAt,
                    q.CompetencyReviewerUserId,
                    history
                        .Select(e => new ManagedExpertEventRow(
                            e.ActorUserId,
                            e.FromStatus,
                            e.ToStatus,
                            e.Note,
                            e.CreatedAt
                        ))
                        .ToArray()
                );
            })
            .OrderByDescending(r => r.ApprovedAt)
            .ToArray();
    }
}
