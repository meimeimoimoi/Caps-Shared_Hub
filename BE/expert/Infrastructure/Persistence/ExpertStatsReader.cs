using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Qualifications;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>EF Core queries behind the admin dashboard; grouping and counting run in the database.</summary>
public sealed class ExpertStatsReader(ExpertDbContext db) : IExpertStatsReader
{
    public async Task<IReadOnlyList<DateTimeOffset>> ListFirstApprovalsAsync(
        DateTimeOffset start,
        DateTimeOffset endBefore,
        CancellationToken ct
    ) =>
        await db
            .QualificationEvents.AsNoTracking()
            .Where(e =>
                e.FromStatus == QualificationStatus.PendingFinalApproval
                && e.ToStatus == QualificationStatus.ApprovedForService
            )
            .Join(
                db.Qualifications.AsNoTracking(),
                e => e.QualificationId,
                q => q.Id,
                (e, q) => new { q.ExpertProfileId, e.CreatedAt }
            )
            .GroupBy(x => x.ExpertProfileId)
            .Select(g => g.Min(x => x.CreatedAt))
            .Where(first => first >= start && first < endBefore)
            .ToListAsync(ct);

    public Task<int> CountServingExpertsAsync(CancellationToken ct) =>
        db
            .Qualifications.AsNoTracking()
            .Where(q => q.Status == QualificationStatus.ApprovedForService)
            .Select(q => q.ExpertProfileId)
            .Distinct()
            .CountAsync(ct);

    public Task<int> CountSuspendedExpertsAsync(CancellationToken ct) =>
        db
            .Qualifications.AsNoTracking()
            .Where(q =>
                q.Status == QualificationStatus.Suspended
                && !db.Qualifications.Any(o =>
                    o.ExpertProfileId == q.ExpertProfileId
                    && o.Status == QualificationStatus.ApprovedForService
                )
            )
            .Select(q => q.ExpertProfileId)
            .Distinct()
            .CountAsync(ct);
}
