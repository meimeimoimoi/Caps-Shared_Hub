using Caps.Expert.Application.Abstractions;
using Caps.Expert.Domain;
using Microsoft.EntityFrameworkCore;

namespace Caps.Expert.Infrastructure.Persistence;

/// <summary>
/// Slots in SQL so the capacity check and the counter move in one statement: two accepts for the last slot
/// cannot both win, and the slot row keyed by case makes every call safe to repeat.
/// </summary>
public sealed class ExpertCaseSlots(ExpertDbContext db) : IExpertCaseSlots
{
    public async Task<int?> TakeAsync(
        Guid profileId,
        Guid reviewCaseId,
        DateTimeOffset now,
        CancellationToken ct
    )
    {
        var inserted = await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            INSERT INTO expert.expert_case_slot (review_case_id, expert_profile_id, taken_at)
            VALUES ({reviewCaseId}, {profileId}, {now})
            ON CONFLICT (review_case_id) DO NOTHING
            """,
            ct
        );
        if (inserted == 0)
        {
            // Already held: a retry for the same expert is fine, another expert means a caller bug
            var sameExpert = await db.ExpertCaseSlots.AnyAsync(
                x => x.ReviewCaseId == reviewCaseId && x.ExpertProfileId == profileId,
                ct
            );
            return sameExpert
                ? await FreeSlotsAsync(profileId, ct)
                : throw ExpertErrors.CaseSlotConflict();
        }
        var counted = await db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            UPDATE expert.expert_profile SET active_cases = active_cases + 1
            WHERE id = {profileId} AND active_cases < capacity
            """,
            ct
        );
        return counted == 1 ? await FreeSlotsAsync(profileId, ct) : null;
    }

    public Task ReleaseAsync(Guid profileId, Guid reviewCaseId, CancellationToken ct) =>
        db.Database.ExecuteSqlInterpolatedAsync(
            $"""
            WITH released AS (
            DELETE FROM expert.expert_case_slot
            WHERE review_case_id = {reviewCaseId} AND expert_profile_id = {profileId}
            RETURNING 1
            )
            UPDATE expert.expert_profile SET active_cases = active_cases - 1
            WHERE id = {profileId} AND EXISTS (SELECT 1 FROM released)
            """,
            ct
        );

    // Inside the caller's transaction, so it counts the slot this take just added
    private Task<int> FreeSlotsAsync(Guid profileId, CancellationToken ct) =>
        db
            .ExpertProfiles.Where(x => x.Id == profileId)
            .Select(x => x.Capacity - x.ActiveCases)
            .SingleAsync(ct);
}
