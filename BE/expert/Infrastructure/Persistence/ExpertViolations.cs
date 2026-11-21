using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain.Profiles;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>Inserts with ON CONFLICT so a redelivered event counts once, and inside the caller's transaction.</summary>
public sealed class ExpertViolations(ExpertDbContext db) : IExpertViolations
{
    public async Task<bool> AddAsync(ExpertViolation violation, CancellationToken ct) =>
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO expert.expert_violation (review_case_id, expert_profile_id, kind, points, occurred_at)
            VALUES ({violation.ReviewCaseId}, {violation.ExpertProfileId}, {violation.Kind}, {violation.Points}, {violation.OccurredAt})
            ON CONFLICT (review_case_id) DO NOTHING
            """,
            ct
        ) == 1;

    public async Task<IReadOnlyDictionary<Guid, int>> PointsAsync(
        IReadOnlyCollection<Guid> profileIds,
        DateTimeOffset since,
        CancellationToken ct
    ) =>
        await db
            .ExpertViolations.Where(x =>
                profileIds.Contains(x.ExpertProfileId)
                && x.ExcusedAt == null
                && x.OccurredAt > since
            )
            .GroupBy(x => x.ExpertProfileId)
            .Select(g => new { g.Key, Points = g.Sum(x => (int)x.Points) })
            .ToDictionaryAsync(x => x.Key, x => x.Points, ct);
}
