using Caps.Expert.Application.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>
/// One statement adds the row and moves the average, so two ratings at once cannot lose a count. The average
/// is rebuilt from the stored stars instead of the rounded average, so rounding never drifts.
/// </summary>
public sealed class ExpertCaseRatings(ExpertDbContext db) : IExpertCaseRatings
{
    public Task AddAsync(
        Guid profileId,
        Guid reviewCaseId,
        short stars,
        DateTimeOffset now,
        CancellationToken ct
    ) =>
        db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            WITH added AS (
            INSERT INTO expert.expert_case_rating (review_case_id, expert_profile_id, stars, rated_at)
            VALUES ({reviewCaseId}, {profileId}, {stars}, {now})
            ON CONFLICT (review_case_id) DO NOTHING
            RETURNING stars
            )
            UPDATE expert.expert_profile p
            SET rating_count = p.rating_count + 1,
                rating_avg = round (
                        ((SELECT coalesce(sum(r.stars), 0) FROM expert.expert_case_rating r
                          WHERE r.expert_profile_id = p.id) + added.stars) :: numeric / (p.rating_count + 1), 2)
            FROM added
            WHERE p.id = {profileId}
            """,
            ct
        );
}
